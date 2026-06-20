from __future__ import annotations
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import text
from sqlalchemy.orm import Session

COMPANY_ID = 1


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def ensure_schema(db: Session) -> None:
    db.execute(text('''
        CREATE TABLE IF NOT EXISTS automotive_disassemblies (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL DEFAULT 1,
            disassembly_code VARCHAR(80) NOT NULL,
            source_lot_id INTEGER NOT NULL REFERENCES inventory_lots(id),
            mode VARCHAR(40) NOT NULL DEFAULT 'parcial',
            status VARCHAR(40) NOT NULL DEFAULT 'registrado',
            source_qty NUMERIC(14,2) NOT NULL DEFAULT 0,
            source_unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
            total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
            allocated_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
            residual_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
            notes TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT false,
            deleted_at TIMESTAMPTZ NULL,
            UNIQUE(company_id, disassembly_code)
        )
    '''))
    db.execute(text('''
        CREATE TABLE IF NOT EXISTS automotive_disassembly_lines (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL DEFAULT 1,
            disassembly_id INTEGER NOT NULL REFERENCES automotive_disassemblies(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES inventory_products(id),
            warehouse_id INTEGER NULL REFERENCES inventory_warehouses(id),
            lot_code VARCHAR(80) NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
            unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
            total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
            created_lot_id INTEGER NULL REFERENCES inventory_lots(id),
            notes TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    '''))
    db.flush()


def _next_code(db: Session) -> str:
    seq = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 FROM automotive_disassemblies WHERE company_id=:company_id"), {'company_id': COMPANY_ID}).scalar() or 1
    return f'DES-{int(seq):06d}'


def _default_warehouse(db: Session) -> int:
    row = db.execute(text('''
        SELECT id FROM inventory_warehouses
        WHERE company_id=:company_id AND is_deleted=false AND is_active=true
        ORDER BY is_default DESC, id ASC LIMIT 1
    '''), {'company_id': COMPANY_ID}).mappings().first()
    if row:
        return int(row['id'])
    row = db.execute(text('''
        INSERT INTO inventory_warehouses (company_id, code, name, location, is_default, is_active, created_at, updated_at, is_deleted)
        VALUES (:company_id, 'CENTRAL', 'Bodega Central', 'Intermotores', true, true, NOW(), NOW(), false)
        RETURNING id
    '''), {'company_id': COMPANY_ID}).mappings().first()
    db.flush()
    return int(row['id'])


def summary(db: Session):
    ensure_schema(db)
    total = db.execute(text('SELECT COUNT(*) FROM automotive_disassemblies WHERE company_id=:company_id AND is_deleted=false'), {'company_id': COMPANY_ID}).scalar() or 0
    active = db.execute(text("SELECT COUNT(*) FROM automotive_disassemblies WHERE company_id=:company_id AND is_deleted=false AND status='registrado'"), {'company_id': COMPANY_ID}).scalar() or 0
    reversed_count = db.execute(text("SELECT COUNT(*) FROM automotive_disassemblies WHERE company_id=:company_id AND is_deleted=false AND status='reversado'"), {'company_id': COMPANY_ID}).scalar() or 0
    disassemblable = db.execute(text("SELECT COUNT(*) FROM inventory_lots WHERE company_id=:company_id AND is_deleted=false AND is_disassemblable=true"), {'company_id': COMPANY_ID}).scalar() or 0
    pending_cost = db.execute(text("SELECT COALESCE(SUM(residual_cost),0) FROM automotive_disassemblies WHERE company_id=:company_id AND is_deleted=false AND status='registrado'"), {'company_id': COMPANY_ID}).scalar() or 0
    return {'total_disassemblies': total, 'active_disassemblies': active, 'reversed_disassemblies': reversed_count, 'disassemblable_lots': disassemblable, 'pending_cost_review': _money(pending_cost)}


def list_disassemblies(db: Session):
    ensure_schema(db)
    return db.execute(text('''
        SELECT id, company_id, disassembly_code, source_lot_id, mode, status, source_qty, source_unit_cost,
               total_cost, allocated_cost, residual_cost, notes
        FROM automotive_disassemblies
        WHERE company_id=:company_id AND is_deleted=false
        ORDER BY id DESC
    '''), {'company_id': COMPANY_ID}).mappings().all()


def get_detail(db: Session, disassembly_id: int):
    ensure_schema(db)
    header = db.execute(text('''
        SELECT id, company_id, disassembly_code, source_lot_id, mode, status, source_qty, source_unit_cost,
               total_cost, allocated_cost, residual_cost, notes
        FROM automotive_disassemblies WHERE id=:id AND company_id=:company_id AND is_deleted=false
    '''), {'id': disassembly_id, 'company_id': COMPANY_ID}).mappings().first()
    if not header:
        return None
    lines = db.execute(text('''
        SELECT id, company_id, disassembly_id, product_id, warehouse_id, lot_code, description, quantity,
               unit_cost, total_cost, created_lot_id, notes
        FROM automotive_disassembly_lines WHERE disassembly_id=:id AND company_id=:company_id ORDER BY id ASC
    '''), {'id': disassembly_id, 'company_id': COMPANY_ID}).mappings().all()
    return {'header': dict(header), 'lines': [dict(line) for line in lines]}


def create_disassembly(db: Session, data):
    ensure_schema(db)
    source = db.execute(text('''
        SELECT * FROM inventory_lots WHERE id=:id AND company_id=:company_id AND is_deleted=false
    '''), {'id': data.source_lot_id, 'company_id': COMPANY_ID}).mappings().first()
    if not source:
        raise ValueError('Lote origen no encontrado.')
    if not source['is_disassemblable']:
        raise ValueError('El lote origen no está marcado como desarmable.')
    if source['is_blocked']:
        raise ValueError('El lote origen está bloqueado y no puede desarmarse.')
    source_qty = Decimal(str(data.source_qty or 0))
    if source_qty <= 0:
        raise ValueError('La cantidad a desarmar debe ser mayor a cero.')
    physical = Decimal(str(source['physical_qty'] or 0))
    reserved = Decimal(str(source['reserved_qty'] or 0))
    blocked = Decimal(str(source['blocked_qty'] or 0))
    available = physical - reserved - blocked
    if source_qty > available:
        raise ValueError(f'No hay suficiente disponible físico para desarmar. Disponible: {available}.')
    if not data.lines:
        raise ValueError('El desarme debe tener al menos un lote hijo.')

    total_line_cost = sum(_money(line.quantity) * _money(line.unit_cost) for line in data.lines)
    source_unit_cost = _money(source['unit_cost'])
    total_cost = _money(source_qty * source_unit_cost)
    if total_line_cost <= 0:
        # Distribución automática proporcional por cantidad si el usuario no definió costo.
        total_child_qty = sum(Decimal(str(line.quantity or 0)) for line in data.lines)
        if total_child_qty <= 0:
            raise ValueError('Las cantidades de los lotes hijos deben ser mayores a cero.')
        auto_unit = _money(total_cost / total_child_qty) if total_child_qty else Decimal('0')
        for line in data.lines:
            line.unit_cost = auto_unit
        total_line_cost = sum(_money(line.quantity) * _money(line.unit_cost) for line in data.lines)

    code = _next_code(db)
    mode = data.mode if data.mode in ['parcial', 'total'] else 'parcial'
    residual = _money(total_cost - total_line_cost)

    header = db.execute(text('''
        INSERT INTO automotive_disassemblies (company_id, disassembly_code, source_lot_id, mode, status, source_qty,
            source_unit_cost, total_cost, allocated_cost, residual_cost, notes, created_at, updated_at, is_deleted)
        VALUES (:company_id, :code, :source_lot_id, :mode, 'registrado', :source_qty, :source_unit_cost, :total_cost,
            :allocated_cost, :residual_cost, :notes, NOW(), NOW(), false)
        RETURNING id, company_id, disassembly_code, source_lot_id, mode, status, source_qty, source_unit_cost, total_cost, allocated_cost, residual_cost, notes
    '''), {'company_id': COMPANY_ID, 'code': code, 'source_lot_id': data.source_lot_id, 'mode': mode, 'source_qty': source_qty,
           'source_unit_cost': source_unit_cost, 'total_cost': total_cost, 'allocated_cost': total_line_cost, 'residual_cost': residual,
           'notes': data.notes or ''}).mappings().first()
    disassembly_id = int(header['id'])

    physical_after = physical - source_qty
    accounting = Decimal(str(source['accounting_qty'] or 0))
    accounting_after = accounting if source['is_out_of_accounting_inventory'] else accounting - source_qty
    if accounting_after < 0:
        accounting_after = Decimal('0')
    db.execute(text('''
        UPDATE inventory_lots
        SET physical_qty=:physical_after, accounting_qty=:accounting_after, quantity_available=:physical_after,
            disassembly_status=:status, updated_at=NOW()
        WHERE id=:id
    '''), {'physical_after': physical_after, 'accounting_after': accounting_after, 'status': 'desarmado_total' if mode == 'total' or physical_after <= 0 else 'desarmado_parcial', 'id': data.source_lot_id})
    db.execute(text('''
        INSERT INTO inventory_kardex_movements (company_id, product_id, lot_id, warehouse_id, movement_type, reference_type, reference_id,
            affects_physical, affects_accounting, quantity, unit_cost, physical_balance_after, accounting_balance_after, balance_after, notes, created_at, updated_at)
        VALUES (:company_id, :product_id, :lot_id, :warehouse_id, 'desarme_salida', 'desarme', :reference_id,
            true, :affects_accounting, :quantity, :unit_cost, :physical_after, :accounting_after, :physical_after, :notes, NOW(), NOW())
    '''), {'company_id': COMPANY_ID, 'product_id': source['product_id'], 'lot_id': source['id'], 'warehouse_id': source['warehouse_id'],
           'reference_id': str(disassembly_id), 'affects_accounting': not source['is_out_of_accounting_inventory'], 'quantity': -source_qty,
           'unit_cost': source_unit_cost, 'physical_after': physical_after, 'accounting_after': accounting_after,
           'notes': f'Desarme {code}: salida de lote origen.'})

    for line in data.lines:
        qty = Decimal(str(line.quantity or 0))
        if qty <= 0:
            raise ValueError('Todas las cantidades de lotes hijos deben ser mayores a cero.')
        warehouse_id = line.warehouse_id or source['warehouse_id'] or _default_warehouse(db)
        unit_cost = _money(line.unit_cost)
        line_total = _money(qty * unit_cost)
        existing = db.execute(text('SELECT id FROM inventory_lots WHERE company_id=:company_id AND lot_code=:lot_code AND is_deleted=false'), {'company_id': COMPANY_ID, 'lot_code': line.lot_code}).first()
        if existing:
            raise ValueError(f'Ya existe un lote con código {line.lot_code}.')
        child_accounting_qty = Decimal('0') if source['is_out_of_accounting_inventory'] else qty
        child = db.execute(text('''
            INSERT INTO inventory_lots (company_id, product_id, warehouse_id, lot_code, barcode, qr_code, engine_number, serial_number,
                condition, location, quantity_initial, quantity_available, physical_initial_qty, physical_qty, accounting_initial_qty, accounting_qty,
                reserved_qty, pending_exit_qty, blocked_qty, unit_cost, cost_includes_tax, sale_price, special_lot_price,
                is_out_of_accounting_inventory, is_sellable, is_blocked, inventory_status, is_disassemblable, disassembly_status,
                parent_lot_id, original_cost, distributed_cost, pending_cost_to_distribute, notes, is_active, created_at, updated_at, is_deleted)
            VALUES (:company_id, :product_id, :warehouse_id, :lot_code, '', '', '', '', :condition, '', :qty, :qty, :qty, :qty,
                :accounting_qty, :accounting_qty, 0, 0, 0, :unit_cost, true, 0, 0, :out_accounting, true, false, 'disponible', false, 'hijo_desarme',
                :parent_lot_id, :line_total, :line_total, 0, :notes, true, NOW(), NOW(), false)
            RETURNING id
        '''), {'company_id': COMPANY_ID, 'product_id': line.product_id, 'warehouse_id': warehouse_id, 'lot_code': line.lot_code,
               'condition': source['condition'], 'qty': qty, 'accounting_qty': child_accounting_qty, 'unit_cost': unit_cost,
               'out_accounting': source['is_out_of_accounting_inventory'], 'parent_lot_id': source['id'], 'line_total': line_total,
               'notes': (line.notes or '') + f' | Lote hijo del desarme {code}'}).mappings().first()
        child_lot_id = int(child['id'])
        db.execute(text('''
            INSERT INTO automotive_disassembly_lines (company_id, disassembly_id, product_id, warehouse_id, lot_code, description,
                quantity, unit_cost, total_cost, created_lot_id, notes, created_at, updated_at)
            VALUES (:company_id, :disassembly_id, :product_id, :warehouse_id, :lot_code, :description,
                :quantity, :unit_cost, :total_cost, :created_lot_id, :notes, NOW(), NOW())
        '''), {'company_id': COMPANY_ID, 'disassembly_id': disassembly_id, 'product_id': line.product_id, 'warehouse_id': warehouse_id,
               'lot_code': line.lot_code, 'description': line.description or '', 'quantity': qty, 'unit_cost': unit_cost,
               'total_cost': line_total, 'created_lot_id': child_lot_id, 'notes': line.notes or ''})
        db.execute(text('''
            INSERT INTO inventory_kardex_movements (company_id, product_id, lot_id, warehouse_id, movement_type, reference_type, reference_id,
                affects_physical, affects_accounting, quantity, unit_cost, physical_balance_after, accounting_balance_after, balance_after, notes, created_at, updated_at)
            VALUES (:company_id, :product_id, :lot_id, :warehouse_id, 'desarme_entrada', 'desarme', :reference_id,
                true, :affects_accounting, :quantity, :unit_cost, :physical_after, :accounting_after, :physical_after, :notes, NOW(), NOW())
        '''), {'company_id': COMPANY_ID, 'product_id': line.product_id, 'lot_id': child_lot_id, 'warehouse_id': warehouse_id,
               'reference_id': str(disassembly_id), 'affects_accounting': not source['is_out_of_accounting_inventory'], 'quantity': qty,
               'unit_cost': unit_cost, 'physical_after': qty, 'accounting_after': child_accounting_qty,
               'notes': f'Desarme {code}: creación de lote hijo.'})
    db.commit()
    return get_detail(db, disassembly_id)


def reverse_disassembly(db: Session, disassembly_id: int, reason: str = 'Reversión de desarme'):
    ensure_schema(db)
    detail = get_detail(db, disassembly_id)
    if not detail:
        raise ValueError('Desarme no encontrado.')
    header = detail['header']
    if header['status'] != 'registrado':
        raise ValueError('Solo se pueden revertir desarmes registrados.')
    source = db.execute(text('SELECT * FROM inventory_lots WHERE id=:id AND company_id=:company_id'), {'id': header['source_lot_id'], 'company_id': COMPANY_ID}).mappings().first()
    for line in detail['lines']:
        child = db.execute(text('SELECT * FROM inventory_lots WHERE id=:id AND company_id=:company_id AND is_deleted=false'), {'id': line['created_lot_id'], 'company_id': COMPANY_ID}).mappings().first()
        if not child:
            raise ValueError(f'No se puede revertir: lote hijo {line["lot_code"]} no existe o ya fue eliminado.')
        qty = Decimal(str(line['quantity']))
        if Decimal(str(child['physical_qty'] or 0)) != qty:
            raise ValueError(f'No se puede revertir: lote hijo {line["lot_code"]} ya tuvo movimientos físicos.')
        if not child['is_out_of_accounting_inventory'] and Decimal(str(child['accounting_qty'] or 0)) != qty:
            raise ValueError(f'No se puede revertir: lote hijo {line["lot_code"]} ya tuvo movimientos contables.')
        db.execute(text('UPDATE inventory_lots SET is_deleted=true, is_active=false, deleted_at=NOW(), updated_at=NOW() WHERE id=:id'), {'id': child['id']})
        db.execute(text('''
            INSERT INTO inventory_kardex_movements (company_id, product_id, lot_id, warehouse_id, movement_type, reference_type, reference_id,
                affects_physical, affects_accounting, quantity, unit_cost, physical_balance_after, accounting_balance_after, balance_after, notes, created_at, updated_at)
            VALUES (:company_id, :product_id, :lot_id, :warehouse_id, 'desarme_reversa_hijo', 'desarme', :reference_id,
                true, :affects_accounting, :quantity, :unit_cost, 0, 0, 0, :notes, NOW(), NOW())
        '''), {'company_id': COMPANY_ID, 'product_id': child['product_id'], 'lot_id': child['id'], 'warehouse_id': child['warehouse_id'],
               'reference_id': str(disassembly_id), 'affects_accounting': not child['is_out_of_accounting_inventory'], 'quantity': -qty,
               'unit_cost': child['unit_cost'], 'notes': reason})
    source_qty = Decimal(str(header['source_qty']))
    source_physical = Decimal(str(source['physical_qty'] or 0)) + source_qty
    source_accounting = Decimal(str(source['accounting_qty'] or 0)) if source['is_out_of_accounting_inventory'] else Decimal(str(source['accounting_qty'] or 0)) + source_qty
    db.execute(text('''
        UPDATE inventory_lots SET physical_qty=:physical, accounting_qty=:accounting, quantity_available=:physical,
            disassembly_status='reversado', updated_at=NOW() WHERE id=:id
    '''), {'physical': source_physical, 'accounting': source_accounting, 'id': source['id']})
    db.execute(text("UPDATE automotive_disassemblies SET status='reversado', notes=notes || :reason, updated_at=NOW() WHERE id=:id"), {'reason': f'\nReversado: {reason}', 'id': disassembly_id})
    db.execute(text('''
        INSERT INTO inventory_kardex_movements (company_id, product_id, lot_id, warehouse_id, movement_type, reference_type, reference_id,
            affects_physical, affects_accounting, quantity, unit_cost, physical_balance_after, accounting_balance_after, balance_after, notes, created_at, updated_at)
        VALUES (:company_id, :product_id, :lot_id, :warehouse_id, 'desarme_reversa_origen', 'desarme', :reference_id,
            true, :affects_accounting, :quantity, :unit_cost, :physical_after, :accounting_after, :physical_after, :notes, NOW(), NOW())
    '''), {'company_id': COMPANY_ID, 'product_id': source['product_id'], 'lot_id': source['id'], 'warehouse_id': source['warehouse_id'],
           'reference_id': str(disassembly_id), 'affects_accounting': not source['is_out_of_accounting_inventory'], 'quantity': source_qty,
           'unit_cost': source['unit_cost'], 'physical_after': source_physical, 'accounting_after': source_accounting, 'notes': reason})
    db.commit()
    return get_detail(db, disassembly_id)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database.session import get_db
from app.domains.disassembly import schemas, service

router = APIRouter(prefix='/disassemblies', tags=['Desarmes'])

@router.get('/summary', response_model=schemas.DisassemblySummary)
def get_summary(db: Session = Depends(get_db)):
    return service.summary(db)

@router.get('', response_model=list[schemas.DisassemblyRead])
def list_disassemblies(db: Session = Depends(get_db)):
    return service.list_disassemblies(db)

@router.get('/{disassembly_id}', response_model=schemas.DisassemblyDetail)
def get_disassembly(disassembly_id: int, db: Session = Depends(get_db)):
    item = service.get_detail(db, disassembly_id)
    if not item:
        raise HTTPException(status_code=404, detail='Desarme no encontrado')
    return item

@router.post('', response_model=schemas.DisassemblyDetail)
def create_disassembly(data: schemas.DisassemblyCreate, db: Session = Depends(get_db)):
    try:
        return service.create_disassembly(db, data)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

@router.post('/{disassembly_id}/reverse', response_model=schemas.DisassemblyDetail)
def reverse_disassembly(disassembly_id: int, reason: str = 'Reversión de desarme', db: Session = Depends(get_db)):
    try:
        return service.reverse_disassembly(db, disassembly_id, reason=reason)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database.session import get_db
from app.domains.financial import schemas, service

router = APIRouter(prefix='/financial', tags=['Financiero'])

@router.get('/summary', response_model=schemas.FinancialSummary)
def summary(db: Session = Depends(get_db)):
    return service.summary(db)

@router.get('/cash-sessions', response_model=list[schemas.CashSessionRead])
def list_cash_sessions(db: Session = Depends(get_db)):
    return service.list_cash_sessions(db)

@router.post('/cash-sessions', response_model=schemas.CashSessionRead)
def open_cash_session(data: schemas.CashSessionCreate, db: Session = Depends(get_db)):
    return service.open_cash_session(db, data)

@router.post('/cash-sessions/{session_id}/close', response_model=schemas.CashSessionRead)
def close_cash_session(session_id: int, data: schemas.CashSessionClose, db: Session = Depends(get_db)):
    try:
        return service.close_cash_session(db, session_id, data)
    except ValueError as exc:
        db.rollback(); raise HTTPException(status_code=409, detail=str(exc))

@router.get('/payments', response_model=list[schemas.PaymentRead])
def list_payments(db: Session = Depends(get_db)):
    return service.list_payments(db)

@router.post('/payments', response_model=schemas.PaymentRead)
def create_payment(data: schemas.PaymentCreate, db: Session = Depends(get_db)):
    try:
        return service.create_payment(db, data)
    except ValueError as exc:
        db.rollback(); raise HTTPException(status_code=409, detail=str(exc))

@router.get('/receivables', response_model=list[schemas.ReceivableRead])
def receivables(db: Session = Depends(get_db)):
    return service.receivables(db)

@router.get('/bank-accounts', response_model=list[schemas.BankAccountRead])
def list_bank_accounts(db: Session = Depends(get_db)):
    return service.list_bank_accounts(db)

@router.post('/bank-accounts', response_model=schemas.BankAccountRead)
def create_bank_account(data: schemas.BankAccountCreate, db: Session = Depends(get_db)):
    return service.create_bank_account(db, data)

@router.get('/deposits', response_model=list[schemas.DepositRead])
def list_deposits(db: Session = Depends(get_db)):
    return service.list_deposits(db)

@router.post('/deposits', response_model=schemas.DepositRead)
def create_deposit(data: schemas.DepositCreate, db: Session = Depends(get_db)):
    try:
        return service.create_deposit(db, data)
    except ValueError as exc:
        db.rollback(); raise HTTPException(status_code=409, detail=str(exc))

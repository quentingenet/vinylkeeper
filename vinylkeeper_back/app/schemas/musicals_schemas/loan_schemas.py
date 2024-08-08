from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class LoanBase(BaseModel):
    album_id: int
    loan_date: datetime
    return_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoanCreate(LoanBase):
    pass


class LoanUpdate(LoanBase):
    pass


class Loan(LoanBase):
    id: int

    class Config:
        from_attributes = True

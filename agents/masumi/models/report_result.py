from pydantic import BaseModel
from typing import List

class Asset(BaseModel):
	name: str
	amount: int

class Address(BaseModel):
	address: str
	assets: List[Asset]
	comment: str

class ReportResult(BaseModel):
	addresses: List[Address]
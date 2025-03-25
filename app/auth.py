from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import requests
from . import models, schemas
from .database import get_db

# Security configuration
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# NELF API configuration
NELF_API_BASE_URL = "https://slasapi.nelf.gov.ng/api"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme),
                          db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        reg_number: str = payload.get("sub")
        if reg_number is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.reg_number == reg_number).first()
    if user is None:
        raise credentials_exception
    return user

class NELFClient:
    def __init__(self):
        self.base_url = NELF_API_BASE_URL

    def get_institutions(self):
        """Get list of Nigerian institutions"""
        response = requests.get(f"{self.base_url}/services/institutions")
        if response.status_code == 200:
            return response.json()
        return None

    def verify_institute_details(self, matric_number: str, provider_id: str):
        """Verify institute details"""
        data = {
            "matric_number": matric_number,
            "provider_id": provider_id
        }
        response = requests.post(
            f"{self.base_url}/student/verify/institute-details",
            json=data
        )
        if response.status_code == 200:
            return response.json()
        return None

    def verify_jamb_details(self, date_of_birth: str, jamb_number: str, token: str):
        """Verify JAMB details"""
        data = {
            "date_of_birth": date_of_birth,
            "jamb_number": jamb_number
        }
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(
            f"{self.base_url}/student/register/jamb/verify",
            json=data,
            headers=headers
        )
        if response.status_code == 200:
            return response.json()
        return None

def verify_user(db: Session, institute_verification: schemas.InstituteVerification,
                jamb_verification: schemas.JambVerification) -> Optional[models.User]:
    """Complete user verification process"""
    nelf_client = NELFClient()
    
    # Step 1: Verify institute details
    institute_result = nelf_client.verify_institute_details(
        institute_verification.matric_number,
        institute_verification.provider_id
    )
    if not institute_result or not institute_result.get("status"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institute verification failed"
        )

    # Step 2: Verify JAMB details with token from institute verification
    token = institute_result["data"]["token"]
    jamb_result = nelf_client.verify_jamb_details(
        jamb_verification.date_of_birth,
        jamb_verification.jamb_number,
        token
    )
    if not jamb_result or not jamb_result.get("status"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="JAMB verification failed"
        )

    # Create user from verified data
    user_data = jamb_result["data"]
    user = models.User(
        reg_number=user_data["RegNumber"],
        nin=user_data["NIN"],
        surname=user_data["Surname"],
        first_name=user_data["FirstName"],
        middle_name=user_data["Middlename"],
        date_of_birth=user_data["DateofBirth"],
        gender=user_data["Gender"],
        state_of_origin=user_data["StateofOrigin"],
        lga_of_origin=user_data["LGAofOrigin"],
        admission_year=user_data["AdmissionYear"],
        institution=user_data["Institution"],
        institution_code=user_data["InstitutionCode"],
        course=user_data["Course"],
        course_code=user_data["CourseCode"],
        admission_type=user_data["AdmissionType"],
        profile_picture=user_data["ProfilePicture"],
        request_id=user_data["RequestID"]
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create wallet for the user
        wallet = models.Wallet(user_id=user.id)
        db.add(wallet)
        db.commit()

        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

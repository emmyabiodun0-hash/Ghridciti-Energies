from datetime import datetime, timezone
from db import db
from flask_login import UserMixin
from sqlalchemy import ForeignKey, Integer, String, Boolean, Text, DateTime,func
from sqlalchemy.orm import Mapped, mapped_column, relationship

class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), nullable=False, unique=True)
    email = db.Column(db.String(50), unique=True)
    
    is_verified = db.Column(db.Boolean, nullable=True, default=False)
    password = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    tokens = db.relationship('OtpToken', back_populates='user')
    meterrequest = db.relationship('MeterRequest', back_populates='user')
    reset = db.relationship(
    'ResetPasswordToken',
    back_populates='user'
)

    def __repr__(self):
        return f"<User {self.email}>"
    



class OtpToken(db.Model):
    __tablename__ = 'OtpToken'
    id=  db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(5) )
    is_expired = db.Column(db.Boolean, default=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.now())
    expires_at = db.Column(db.DateTime())
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user = db.relationship("User", back_populates='tokens')
    



class MeterOrder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(100))
    meter_type = db.Column(db.String(50))
    status = db.Column(db.String(50), default="Pending")




class ResetPasswordToken(db.Model):
    __tablename__ = "reset"
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(5))
    is_expired = db.Column(db.Boolean, default=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.now())
    expires_at = db.Column(db.DateTime())
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user = db.relationship("User", back_populates='reset')


class MeterRequest(db.Model):
    __tablename__ = "meterrequest"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))

    address1 = db.Column(db.String(200))
    address2 = db.Column(db.String(200))

    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    zip_code = db.Column(db.String(20))
    landmark = db.Column(db.String(100))

    meter_type = db.Column(db.String(50))
    amount = db.Column(db.Float)
    status = db.Column(db.String(50), default="Pending")

    reference = db.Column(db.String(100), unique=True)
    created_at = db.Column(db.DateTime,default=datetime.utcnow)

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    user = db.relationship("User", back_populates='meterrequest')
    





class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)

    reference = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    amount = db.Column(
        db.Float,
        nullable=False
    )

    status = db.Column(
        db.String(50),
        default="pending"
    )

    payment_method = db.Column(
        db.String(50)
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    meter_request_id = db.Column(
        db.Integer,
        db.ForeignKey("meterrequest.id")
    )

    meter_request = db.relationship(
        "MeterRequest",
        backref="payments"
    )







    

 





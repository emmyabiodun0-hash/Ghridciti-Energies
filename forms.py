from flask_wtf import FlaskForm
from wtforms import ValidationError
from wtforms.fields import EmailField, PasswordField, SubmitField
from wtforms.validators import InputRequired, Length



class LoginForm(FlaskForm):
    email = EmailField(
        'Email',
        validators=[InputRequired(),],
    
    )
    password = PasswordField(
        'Password',
        validators=[InputRequired(),],
    )

   
    
    submit = SubmitField("Register")





import os
from datetime import datetime, timedelta
import traceback

from flask_login import current_user, login_required, login_user, LoginManager, logout_user
from flask_migrate import Migrate
import requests

from db import db
from model import  MeterRequest, OtpToken, Payment, ResetPasswordToken, User
from flask import Flask, abort, flash, jsonify, redirect, render_template, request, session, url_for
from flask_sqlalchemy import SQLAlchemy
from form import Logins
from forms import LoginForm
from werkzeug.security import check_password_hash, generate_password_hash
from flask_mail import Mail, Message

from utils import generate_random_otp, send_order_mail,send_registration_mail
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

OTP_LIFESPAN_MINUTES = 10


app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv("DEFAULT_EMAIL")
app.config['MAIL_PASSWORD'] = os.getenv("GMAIL_PASSWORD")
app.config['MAIL_DEFAULT_SENDER'] = os.getenv("DEFAULT_EMAIL")
app.config["PAYSTACK_SECRET_KEY"] = os.getenv("PAYSTACK_SECRET_KEY")




mail = Mail(app)



db.init_app(app=app)

migrate = Migrate(app, db)


login_manager = LoginManager(app)
login_manager.login_view = "login"
login_manager.login_message_category = 'warning'

with app.app_context():
    db.create_all()




@app.route("/")
def index():
    return redirect(url_for("login"))

@app.route("/register", methods=['POST','GET'])
def register():
    
    form = Logins()
    
    if form.validate_on_submit():
        email = form.email.data.lower()
        name = form.full_name.data
        password = form.password.data

        user = User(email=email, username=name, password=generate_password_hash(password))
        __new_otp = generate_random_otp(5)
        token = OtpToken(
        token = __new_otp,
        expires_at = datetime.now() + timedelta(minutes=OTP_LIFESPAN_MINUTES),
        user= user   
        )


        db.session.add_all([user,token])
        db.session.commit()
        session["user_being_verified"] = user.id

        msg= Message(
            subject=f"Verifiy Account: Your OTP is {__new_otp}",
            body=f"Welcome\nYour OTP is {token.token} ",
            recipients=[user.email]
        )
        html_text = render_template("email/verify-email.html", user=user.username,  otp=token.token)
        msg.html = html_text
        # print("MAIL_USERNAME:", app.config['MAIL_USERNAME'])
        # print("MAIL_PASSWORD:", app.config['MAIL_PASSWORD'])
        
        # mail.send(msg)
        try:
            brevo_response = send_registration_mail(
                to=user.email,
                username=user.username,
                otp=__new_otp,
                html_content=html_text
            )
            
            
            
        except Exception as e:
            flash("Account created but there was an error  sending the email", category="danger")
            print("An error occured while sending")
            traceback.print_exc()
            return redirect(url_for('register'))
        
    
        session['user_being_verified'] = user.id

        flash ("Sign up success. Verify your OTP", category="success")
        return redirect(url_for("verify_otp"))
    return render_template("register.html", form=form)







@app.route("/verify-otp", methods=['GET', 'POST'])
def verify_otp():
    if request.method == 'POST':
        token =request.form.get('token')
        user_id = session.get('user_being_verified')
        if user_id is None:
            flash("Invalid request", category="danger")
            return abort(400)
        user = User.query.get(user_id)
        otp_token = OtpToken.query.filter_by(token=token, user_id=user_id).first()
        if otp_token:
            
            if not otp_token.is_used and otp_token.expires_at > datetime.now():
                otp_token.user.is_verified = True
                otp_token.is_used = True

                db.session.add(otp_token)
                db.session.commit()
                
                session.pop("user_being_verified")
                flash("OTP is verified", category="success")
                login_user(user)
                return redirect(url_for("home"))
            
            
            flash("Token has been used or expired", category="danger")
            return render_template("verify-otp.html")
        flash("Invalid OTP token", category="danger")

    return render_template("verify-otp.html")


import uuid
import traceback
from flask import jsonify, request, render_template
from flask_login import login_required, current_user

import uuid
import traceback
import requests

@app.route("/save-order", methods=["POST"])
@login_required
def save_order():

    try:

        data = request.get_json()

        # Generate unique payment reference
        reference = "GHR-" + uuid.uuid4().hex[:10].upper()

        # Create pending order
        order = MeterRequest(
            name=data["name"],
            phone=data["phone"],
            email=data["email"],
            address1=data["addr1"],
            address2=data.get("addr2"),
            city=data["city"],
            state=data["state"],
            zip_code=data["zip"],
            landmark=data.get("landmark"),
            meter_type=data["meter"],
            amount=data["amount"],
            reference=reference,
            status="Pending",
            user_id=current_user.id
        )

        db.session.add(order)
        db.session.commit()

        # Send order email (optional)
        try:

            html_text = render_template(
                "email/order_email.html",
                order=order
            )

            send_order_mail(
                to="gemmy1866@gmail.com",
                customer_name=order.name,
                html_content=html_text
            )

        except Exception:
            traceback.print_exc()

        # -----------------------------
        # INITIALIZE PAYSTACK
        # -----------------------------

        headers = {
            "Authorization": f"Bearer {app.config['PAYSTACK_SECRET_KEY']}",
            "Content-Type": "application/json"
        }

        payload = {
            "email": order.email,
            "amount": int(order.amount * 100),   # Kobo
            "reference": reference,
            "callback_url": "https://ghridciti-energies.onrender.com/payment-success",
            "metadata": {
                "customer_name": order.name,
                "meter_type": order.meter_type,
                "phone": order.phone
            }
        }

        response = requests.post(
            "https://api.paystack.co/transaction/initialize",
            json=payload,
            headers=headers
        )

        result = response.json()

        if not result["status"]:

            return jsonify({
                "success": False,
                "message": result["message"]
            }), 400

        return jsonify({

            "success": True,

            "reference": reference,

            "authorization_url":
                result["data"]["authorization_url"],

            "access_code":
                result["data"]["access_code"]

        })

    except Exception as e:

        db.session.rollback()

        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
    






@app.route("/payment-success")
@login_required
def payment_success():

    print("========== PAYMENT SUCCESS ==========")

    reference = request.args.get("reference")
    print("Reference:", reference)

    headers = {
        "Authorization": f"Bearer {app.config['PAYSTACK_SECRET_KEY']}"
    }

    response = requests.get(
        f"https://api.paystack.co/transaction/verify/{reference}",
        headers=headers
    )

    result = response.json()
    print("Paystack response:", result)

    if result["status"] and result["data"]["status"] == "success":

        order = MeterRequest.query.filter_by(reference=reference).first()
        print("Order found:", order)

        if order:
            print("Status before:", order.status)
            order.status = "Paid"

            payment = Payment.query.filter_by(reference=reference).first()

            if not payment:
                payment = Payment(
                    reference=reference,
                    amount=result["data"]["amount"] / 100,
                    status="success",
                    payment_method=result["data"]["channel"],
                    meter_request_id=order.id
                )
                db.session.add(payment)
                print("Payment created.")
            else:
                print("Payment already exists.")

            db.session.commit()
            print("Database committed.")
            print("Status after:", order.status)

    print("========== END PAYMENT SUCCESS ==========")

    return render_template(
        "payment_success.html",
        order=order,
        reference=reference
    )




import hashlib
import hmac
from flask import request

@app.route("/paystack/webhook", methods=["POST"])
def paystack_webhook():

    signature = request.headers.get("x-paystack-signature")
    payload = request.get_data()

    expected_signature = hmac.new(
        app.config["PAYSTACK_SECRET_KEY"].encode(),
        payload,
        hashlib.sha512
    ).hexdigest()

    if signature != expected_signature:
        return "Invalid signature", 400

    event = request.get_json()

    if event.get("event") != "charge.success":
        return "", 200

    data = event["data"]

    reference = data["reference"]

    order = MeterRequest.query.filter_by(
        reference=reference
    ).first()

    if not order:
        return "", 200

    # Avoid duplicate payments
    payment = Payment.query.filter_by(
        reference=reference
    ).first()

    if payment:
        return "", 200

    order.status = "Paid"

    payment = Payment(
        reference=reference,
        amount=data["amount"] / 100,
        status="success",
        payment_method=data["channel"],
        meter_request_id=order.id
    )

    db.session.add(payment)
    db.session.commit()

    # Optional: send email here
    # html = render_template(...)
    # send_order_mail(...)

    return "", 200


@app.route('/admin')
@login_required
def admin_dashboard():
    # print(current_user.email)
    # print(current_user.is_admin)

    if not current_user.is_admin:
        return "Access Denied", 403

    orders = MeterRequest.query.order_by(
        MeterRequest.id.desc()
    ).all()

    return render_template(
        'admin.html',
        orders=orders
    )

    



app.route("/forget_password", method=['POST', 'GET'])
def forget_password():
    if request.method == 'POST':
        email = request.form.get('email')
        user =  User.query.filter_by(email=email).first()
        if not user:
            flash("Email not found", 'danger')
            return redirect(url_for('forget_password'))
        

    


  

from flask_login import current_user

@app.route('/homepage')
@login_required
def home():

    orders = MeterRequest.query.filter_by(
        user_id=current_user.id
    ).all()

    total_orders = len(orders)

    pending_orders = MeterRequest.query.filter_by(
        user_id=current_user.id,
        status="Pending"
    ).count()

    dispatched_orders = MeterRequest.query.filter_by(
        user_id=current_user.id,
        status="Dispatched"
    ).count()

    delivered_orders = MeterRequest.query.filter_by(
        user_id=current_user.id,
        status="Delivered"
    ).count()

    total_amount = db.session.query(
        db.func.sum(MeterRequest.amount)
    ).filter(
        MeterRequest.user_id == current_user.id
    ).scalar() or 0


    # DEBUG INFORMATION
    # print("\n========== DASHBOARD DEBUG ==========")
    # print("Current User ID:", current_user.id)
    # print("Current User Email:", current_user.email)

    # print("Total Orders:", total_orders)
    # print("Pending Orders:", pending_orders)
    # print("Dispatched Orders:", dispatched_orders)
    # print("Delivered Orders:", delivered_orders)

    # for order in orders:
    #     print(
    #         "Order ID:", order.id,
    #         "| Reference:", order.reference,
    #         "| Status:", order.status,
    #         "| User ID:", order.user_id
    #     )

    # print("=====================================\n")


    return render_template(
        "index.html",
        orders=orders,
        total_orders=total_orders,
        pending_orders=pending_orders,
        dispatched_orders=dispatched_orders,
        delivered_orders=delivered_orders,
        total_amount=total_amount
    )

@app.route('/admin/update-order/<int:order_id>', methods=['POST'])
@login_required
def update_order_status(order_id):

    if not current_user.is_admin:
        return "Unauthorized", 403

    order = MeterRequest.query.get_or_404(order_id)

    print("Old status:", order.status)

    order.status = request.form.get("status")

    print("New status:", order.status)

    db.session.commit()

    return redirect(url_for('admin_dashboard'))





@app.route("/logout")
def logout():
    logout_user()
    session.clear()
    return redirect(url_for("login"))




@app.before_request
def refresh_session():
    if current_user.is_authenticated:
        session.permanent = True
        session.modified = True


@app.route("/login", methods=['POST', 'GET'])
def login():
    form = LoginForm()

    if form.validate_on_submit():
        email = form.email.data.lower()
        password = form.password.data

        user = User.query.filter_by(email=email).first()

        if user is None:
            flash("Invalid Email", category="danger")

        elif check_password_hash(user.password, password):

            login_user(user)

            # Start the inactivity timer
            session.permanent = True

            return redirect(url_for("home"))

        else:
            flash("Invalid Password", category="danger")

    return render_template("login.html", form=form)




@app.route("/forget-password", methods=['GET', 'POST'])
def forget_password():

    if request.method == 'POST':

        email = request.form.get('email')

        user = User.query.filter_by(
            email=email
        ).first()

        if not user:
            flash(
                "Email not found",
                "danger"
            )
            return redirect(
                url_for('forget_password')
            )

        # Generate OTP
        __new_otp = generate_random_otp(5)

        token = ResetPasswordToken(
            token=__new_otp,
            expires_at=datetime.now() + timedelta(
                minutes=OTP_LIFESPAN_MINUTES
            ),
            user=user
        )

        db.session.add(token)
        db.session.commit()

        # Render email template
        html_text = render_template(
            "email/reset-password.html",
            username=user.username,
            otp=__new_otp
        )

        # Send email
        msg= Message(
            subject=f"Verifiy Account: Your OTP is {__new_otp}",
            body=f"Welcome\nYour OTP is {token.token} ",
            recipients=[user.email]
        )

        msg.html = html_text

        # mail.send(msg)
        try:
            send_registration_mail(
                to=user.email,
                username=user.username,
                otp=__new_otp,
                html_content=html_text
            )

        except Exception:
            flash("There was an error sending the email.", "danger")
            traceback.print_exc()
            return redirect(url_for('forget_password'))

        # Save user in session
        session['user_being_verified'] = user.id

        flash(
            "Password reset OTP has been sent to your email. Please check your inbox.",
            "success"
        )

        return redirect(
            url_for('forget_password_verify_otp')
        )

    return render_template(
        "forget-password-otp.html"
    )




@app.route("/forget-password-otp-verification", methods=['POST', 'GET'])
def forget_password_verify_otp():
    if request.method == 'POST':
        token = request.form.get('token')
        user_id = session.get('user_being_verified')
        print("DEBUG USER ID:", user_id)
        print("DEBUG TOKEN:", token)
        if user_id is None:
            flash("Invalid request", category="danger")
            abort(400)
        user = User.query.get(user_id)
        reset_password_token = ResetPasswordToken.query.filter_by(token=token, user_id=user_id).first()
        print("ALL TOKENS FOR USER:", reset_password_token)
        if reset_password_token:
            # IF TOKEN HAS NOT EXPIRED
            if not reset_password_token.is_used and reset_password_token.expires_at > datetime.now():
                
                reset_password_token.is_used = True

                db.session.add(reset_password_token)
                db.session.commit()
                
                session.pop("user_being_verified")
                session['reset_email'] = reset_password_token.user.email
                flash("Reset Password OTP verify", category="success")
                
                return redirect(url_for("new_reset_password"))
            
            
            flash("Reset password Token has been used or expired", category="danger")
            return render_template("forget-password-verify-otp.html")
        flash("Invalid OTP token", category="danger")
       

    return render_template("forget-password-verify-otp.html")





@app.route("/new-reset-password", methods=['POST', 'GET'])
def new_reset_password():
    if request.method == "POST":
        new_password = request.form.get("password")

        user = User.query.filter_by(email=session.get("reset_email")).first()

        if user:
            user.password = generate_password_hash(new_password)

            db.session.commit()

            flash("Password successfully changed. You can now login.", "success")
            return redirect(url_for("login"))

    return render_template("new-reset-password.html")







@login_manager.user_loader
def get_user(pk):
    return User.query.filter_by(id=int(pk)).first()

if __name__ == "__main__":
    app.run(debug=True)
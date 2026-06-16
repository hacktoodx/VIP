// firebase-config.js (Admin Dashboard)
// แก้ไขค่าให้ตรงกับ Firebase Project ของคุณ

const firebaseConfig = {
  apiKey: "AIzaSyAZOV50p4Lr9lq8fnlVj7sJ0eh5B-51HIM",
  authDomain: "hacktood.firebaseapp.com",
  projectId: "hacktood",
  storageBucket: "hacktood.firebasestorage.app",
  messagingSenderId: "893745591185",
  appId: "1:893745591185:web:f0dddecc4f02e638a02030",
  measurementId: "G-S0E76LG003"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// GAS Web App URL สำหรับเรียก action ต่างๆ
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx0BaAx31vly69TKSJnMJPQFfzfVeGVyp4ThJzcdsdr3ogxv8H13hkhjVFQsTl9Xbnq/exec";

// Admin PIN (ตัวเลข 6 หลัก) — เปลี่ยนเป็นรหัสของคุณ
const ADMIN_PIN = "253110";

// Admin Telegram ID ของคุณ (ใช้ส่งไปกับ request เพื่อยืนยันสิทธิ์)
const ADMIN_TELEGRAM_ID = 7234688831;

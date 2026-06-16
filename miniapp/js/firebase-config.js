// firebase-config.js
// Firebase Configuration - แก้ไขค่าให้ตรงกับ Firebase Project ของคุณ
// หาค่านี้ได้จาก Firebase Console > Project Settings > General > Your apps > Web App

const firebaseConfig = {
  apiKey: "AIzaSyAZOV50p4Lr9lq8fnlVj7sJ0eh5B-51HIM",
  authDomain: "hacktood.firebaseapp.com",
  projectId: "hacktood",
  storageBucket: "hacktood.firebasestorage.app",
  messagingSenderId: "893745591185",
  appId: "1:893745591185:web:f0dddecc4f02e638a02030",
  measurementId: "G-S0E76LG003"
};

// Initialize Firebase (ใช้ Firebase SDK v9 compat สำหรับความง่าย)
firebase.initializeApp(firebaseConfig);

// Export Firestore instance
const db = firebase.firestore();

// Export GAS Web App URL (ใช้สำหรับเรียก action เช่น แจ้งเตือน Admin)
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx0BaAx31vly69TKSJnMJPQFfzfVeGVyp4ThJzcdsdr3ogxv8H13hkhjVFQsTl9Xbnq/exec";

package com.example.foodlink.data.model

data class AuthResponse(
    val success: Boolean,
    val message: String,
    val user: User? = null,
    val verificationCode: String? = null
)

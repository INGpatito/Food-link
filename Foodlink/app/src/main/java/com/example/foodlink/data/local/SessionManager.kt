package com.example.foodlink.data.local

import android.content.Context
import com.example.foodlink.data.model.User

class SessionManager(context: Context) {
    private val prefs = context.getSharedPreferences("foodlink_session", Context.MODE_PRIVATE)

    fun saveUser(user: User) {
        prefs.edit().apply {
            putInt("user_id", user.id)
            putString("user_name", user.name)
            putString("user_email", user.email)
            putBoolean("user_verified", user.isVerified)
            apply()
        }
    }

    fun getUser(): User? {
        val id = prefs.getInt("user_id", -1)
        if (id == -1) return null
        val name = prefs.getString("user_name", "") ?: ""
        val email = prefs.getString("user_email", "") ?: ""
        val isVerified = prefs.getBoolean("user_verified", false)
        return User(id, name, email, isVerified)
    }

    fun clearSession() {
        prefs.edit().clear().apply()
    }
}

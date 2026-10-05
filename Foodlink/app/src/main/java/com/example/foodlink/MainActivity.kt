package com.example.foodlink

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.foodlink.data.local.SessionManager
import com.example.foodlink.ui.auth.AuthScreen
import com.example.foodlink.ui.theme.FoodLinkTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val sessionManager = SessionManager(applicationContext)

        setContent {
            FoodLinkTheme {
                AuthScreen(sessionManager = sessionManager)
            }
        }
    }
}
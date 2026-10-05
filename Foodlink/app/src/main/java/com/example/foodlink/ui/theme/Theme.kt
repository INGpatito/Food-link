package com.example.foodlink.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val FoodlinkColorScheme = darkColorScheme(
    primary = BrandPrimary,
    secondary = BrandAccent,
    tertiary = BrandPrimaryDark,
    background = BrandDarkBg,
    surface = BrandSurface,
    onPrimary = BrandTextPrimary,
    onSecondary = BrandTextPrimary,
    onTertiary = BrandTextPrimary,
    onBackground = BrandTextPrimary,
    onSurface = BrandTextPrimary
)

@Composable
fun FoodLinkTheme(
    content: @Composable () -> Unit
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            window?.let {
                val insetsController = WindowCompat.getInsetsController(it, view)
                insetsController.isAppearanceLightStatusBars = false
                insetsController.isAppearanceLightNavigationBars = false
            }
        }
    }

    MaterialTheme(
        colorScheme = FoodlinkColorScheme,
        typography = Typography,
        content = content
    )
}
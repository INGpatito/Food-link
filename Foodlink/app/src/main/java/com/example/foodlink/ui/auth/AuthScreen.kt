package com.example.foodlink.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodlink.data.local.SessionManager
import com.example.foodlink.data.model.User
import com.example.foodlink.data.remote.AuthApi
import com.example.foodlink.ui.theme.BrandAccent
import com.example.foodlink.ui.theme.BrandCard
import com.example.foodlink.ui.theme.BrandCardBorder
import com.example.foodlink.ui.theme.BrandDarkBg
import com.example.foodlink.ui.theme.BrandError
import com.example.foodlink.ui.theme.BrandErrorBg
import com.example.foodlink.ui.theme.BrandPrimary
import com.example.foodlink.ui.theme.BrandSuccess
import com.example.foodlink.ui.theme.BrandSuccessBg
import com.example.foodlink.ui.theme.BrandTextMuted
import com.example.foodlink.ui.theme.BrandTextPrimary
import com.example.foodlink.ui.theme.BrandTextSecondary
import kotlinx.coroutines.launch

@Composable
fun AuthScreen(sessionManager: SessionManager) {
    var currentUser by remember { mutableStateOf(sessionManager.getUser()) }

    // Si ya hay sesion iniciada, muestra la pantalla de bienvenida con "Hola, [nombre]"
    if (currentUser != null) {
        LoggedInWelcomeScreen(
            user = currentUser!!,
            onLogout = {
                sessionManager.clearSession()
                currentUser = null
            }
        )
    } else {
        AuthFormScreen(
            onLoginSuccess = { user ->
                sessionManager.saveUser(user)
                currentUser = user
            }
        )
    }
}

@Composable
fun LoggedInWelcomeScreen(
    user: User,
    onLogout: () -> Unit
) {
    val scrollState = rememberScrollState()
    val firstName = user.name.trim().split(" ").firstOrNull() ?: user.name

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandDarkBg)
            .padding(horizontal = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Marca superior
            BrandedHeader()

            Spacer(modifier = Modifier.height(32.dp))

            // Tarjeta principal de bienvenida "Hola, [nombre]"
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(32.dp))
                    .background(BrandCard)
                    .border(1.dp, BrandCardBorder, RoundedCornerShape(32.dp))
                    .padding(28.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Avatar con inicial
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(Color(0x33E86A33))
                            .border(2.dp, BrandPrimary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (user.name.firstOrNull() ?: 'U').uppercase(),
                            color = BrandAccent,
                            fontSize = 30.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Saludo solicitado: Hola, [nombre]
                    Text(
                        text = "Hola, $firstName",
                        color = BrandTextPrimary,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = user.email,
                        color = BrandTextSecondary,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Insignia de estado verificado
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(50.dp))
                            .background(BrandSuccessBg)
                            .border(1.dp, BrandSuccess.copy(alpha = 0.5f), RoundedCornerShape(50.dp))
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = BrandSuccess,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = if (user.isVerified) "VERIFICADO" else "PENDIENTE",
                            color = BrandSuccess,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Seccion de beneficios idéntica a la web
                    Text(
                        text = "BENEFICIOS DE COMENSAL ACTIVO",
                        color = BrandTextMuted,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Start
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        PerkItem(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Default.Shield,
                            title = "Seguridad",
                            description = "Tus datos estan seguros en nuestro sitio."
                        )
                        PerkItem(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Default.Star,
                            title = "Favoritos 3D",
                            description = "Guarda platillos y personaliza recetas."
                        )
                    }

                    Spacer(modifier = Modifier.height(28.dp))

                    // Boton para cerrar sesion
                    OutlinedButton(
                        onClick = onLogout,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(50.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF)),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = BrandTextSecondary
                        )
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "CERRAR SESION",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PerkItem(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0x0AFFFFFF))
            .border(1.dp, Color(0x14FFFFFF), RoundedCornerShape(16.dp))
            .padding(12.dp)
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = BrandAccent,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = title,
                    color = BrandAccent,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = description,
                color = BrandTextSecondary,
                fontSize = 10.sp,
                lineHeight = 14.sp
            )
        }
    }
}

@Composable
fun AuthFormScreen(
    onLoginSuccess: (User) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) } // 0 = Iniciar Sesion, 1 = Registrarse
    var inVerificationMode by remember { mutableStateOf(false) }

    // Campos de Login
    var loginEmail by remember { mutableStateOf("") }
    var loginPassword by remember { mutableStateOf("") }
    var loginPasswordVisible by remember { mutableStateOf(false) }

    // Campos de Registro
    var registerName by remember { mutableStateOf("") }
    var registerEmail by remember { mutableStateOf("") }
    var registerPassword by remember { mutableStateOf("") }
    var registerPasswordVisible by remember { mutableStateOf(false) }

    // Campos de Verificacion
    var pendingVerificationEmail by remember { mutableStateOf("") }
    var verificationCodeInput by remember { mutableStateOf("") }

    // Estado de carga y mensajes
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandDarkBg)
            .imePadding()
            .padding(horizontal = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(vertical = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            BrandedHeader()

            Spacer(modifier = Modifier.height(28.dp))

            // Card principal del formulario
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(32.dp))
                    .background(BrandCard)
                    .border(1.dp, BrandCardBorder, RoundedCornerShape(32.dp))
                    .padding(24.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {

                    if (!inVerificationMode) {
                        // Selector de pestañas: Iniciar Sesión / Registrarse
                        SegmentedTabBar(
                            selectedTab = selectedTab,
                            onTabSelected = { tab ->
                                selectedTab = tab
                                errorMessage = null
                                successMessage = null
                            }
                        )

                        Spacer(modifier = Modifier.height(20.dp))
                    }

                    // Mensajes de alerta
                    AnimatedVisibility(
                        visible = errorMessage != null,
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        errorMessage?.let { msg ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(BrandErrorBg)
                                    .border(1.dp, BrandError.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                                    .padding(12.dp)
                            ) {
                                Text(
                                    text = msg,
                                    color = Color(0xFFFCA5A5),
                                    fontSize = 12.sp,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            Spacer(modifier = Modifier.height(14.dp))
                        }
                    }

                    AnimatedVisibility(
                        visible = successMessage != null,
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        successMessage?.let { msg ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(BrandSuccessBg)
                                    .border(1.dp, BrandSuccess.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                                    .padding(12.dp)
                            ) {
                                Text(
                                    text = msg,
                                    color = Color(0xFFA7F3D0),
                                    fontSize = 12.sp,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            Spacer(modifier = Modifier.height(14.dp))
                        }
                    }

                    // Pestaña 1: Iniciar Sesión
                    if (!inVerificationMode && selectedTab == 0) {
                        Text(
                            text = "Correo electrónico",
                            color = BrandTextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        CustomTextField(
                            value = loginEmail,
                            onValueChange = { loginEmail = it },
                            placeholder = "ejemplo@foodlink.com",
                            leadingIcon = Icons.Default.Email,
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Text(
                            text = "Contraseña",
                            color = BrandTextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        CustomTextField(
                            value = loginPassword,
                            onValueChange = { loginPassword = it },
                            placeholder = "••••••••",
                            leadingIcon = Icons.Default.Lock,
                            isPassword = true,
                            passwordVisible = loginPasswordVisible,
                            onTogglePasswordVisibility = { loginPasswordVisible = !loginPasswordVisible },
                            imeAction = ImeAction.Done,
                            onDone = {
                                if (loginEmail.isNotBlank() && loginPassword.isNotBlank()) {
                                    coroutineScope.launch {
                                        isLoading = true
                                        errorMessage = null
                                        val response = AuthApi.login(loginEmail, loginPassword)
                                        isLoading = false
                                        if (response.success && response.user != null) {
                                            onLoginSuccess(response.user)
                                        } else {
                                            errorMessage = response.message
                                        }
                                    }
                                }
                            }
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        ActionButton(
                            text = "ENTRAR A FOODLINK",
                            isLoading = isLoading,
                            onClick = {
                                if (loginEmail.isBlank() || loginPassword.isBlank()) {
                                    errorMessage = "Por favor ingresa tu correo y contraseña."
                                    return@ActionButton
                                }
                                coroutineScope.launch {
                                    isLoading = true
                                    errorMessage = null
                                    val response = AuthApi.login(loginEmail, loginPassword)
                                    isLoading = false
                                    if (response.success && response.user != null) {
                                        onLoginSuccess(response.user)
                                    } else {
                                        errorMessage = response.message
                                    }
                                }
                            }
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "¿No tienes una cuenta aún? ",
                                color = BrandTextSecondary,
                                fontSize = 12.sp
                            )
                            Text(
                                text = "Regístrate gratis",
                                color = BrandAccent,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable {
                                    selectedTab = 1
                                    errorMessage = null
                                }
                            )
                        }
                    }

                    // Pestaña 2: Registrarse
                    if (!inVerificationMode && selectedTab == 1) {
                        Text(
                            text = "Nombre completo",
                            color = BrandTextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        CustomTextField(
                            value = registerName,
                            onValueChange = { registerName = it },
                            placeholder = "Nombre apellidos",
                            leadingIcon = Icons.Default.Person,
                            imeAction = ImeAction.Next
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Text(
                            text = "Correo electrónico",
                            color = BrandTextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        CustomTextField(
                            value = registerEmail,
                            onValueChange = { registerEmail = it },
                            placeholder = "tu@correo.com",
                            leadingIcon = Icons.Default.Email,
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Text(
                            text = "Contraseña (mínimo 8 caracteres)",
                            color = BrandTextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        CustomTextField(
                            value = registerPassword,
                            onValueChange = { registerPassword = it },
                            placeholder = "••••••••",
                            leadingIcon = Icons.Default.Lock,
                            isPassword = true,
                            passwordVisible = registerPasswordVisible,
                            onTogglePasswordVisibility = { registerPasswordVisible = !registerPasswordVisible },
                            imeAction = ImeAction.Done
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        ActionButton(
                            text = "CREAR MI CUENTA",
                            isLoading = isLoading,
                            onClick = {
                                if (registerName.isBlank() || registerEmail.isBlank() || registerPassword.isBlank()) {
                                    errorMessage = "Por favor completa todos los campos."
                                    return@ActionButton
                                }
                                if (registerPassword.length < 8) {
                                    errorMessage = "La contraseña debe tener al menos 8 caracteres."
                                    return@ActionButton
                                }
                                coroutineScope.launch {
                                    isLoading = true
                                    errorMessage = null
                                    val response = AuthApi.register(registerName, registerEmail, registerPassword)
                                    isLoading = false
                                    if (response.success) {
                                        pendingVerificationEmail = registerEmail
                                        inVerificationMode = true
                                        successMessage = "Usuario registrado. Ingresa el código enviado a tu correo."
                                    } else {
                                        errorMessage = response.message
                                    }
                                }
                            }
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "¿Ya tienes una cuenta? ",
                                color = BrandTextSecondary,
                                fontSize = 12.sp
                            )
                            Text(
                                text = "Inicia sesión aquí",
                                color = BrandAccent,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable {
                                    selectedTab = 0
                                    errorMessage = null
                                }
                            )
                        }
                    }

                    // Modo Verificacion de Codigo
                    if (inVerificationMode) {
                        Text(
                            text = "Verificación de cuenta",
                            color = BrandTextPrimary,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "Hemos enviado un código de 6 dígitos a $pendingVerificationEmail",
                            color = BrandTextSecondary,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(20.dp))

                        Text(
                            text = "Código de 6 dígitos",
                            color = BrandTextSecondary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(6.dp))

                        OutlinedTextField(
                            value = verificationCodeInput,
                            onValueChange = {
                                if (it.length <= 6 && it.all { char -> char.isDigit() }) {
                                    verificationCodeInput = it
                                }
                            },
                            placeholder = {
                                Text(
                                    "123456",
                                    color = Color(0x33FFFFFF),
                                    fontSize = 20.sp,
                                    fontFamily = FontFamily.Monospace,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                            textStyle = androidx.compose.ui.text.TextStyle(
                                color = BrandTextPrimary,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                letterSpacing = 8.sp,
                                textAlign = TextAlign.Center
                            ),
                            shape = RoundedCornerShape(18.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BrandPrimary,
                                unfocusedBorderColor = Color(0x33FFFFFF),
                                focusedContainerColor = Color(0x14FFFFFF),
                                unfocusedContainerColor = Color(0x0AFFFFFF),
                                cursorColor = BrandPrimary
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(24.dp))

                        ActionButton(
                            text = "CONFIRMAR Y ACCEDER",
                            isLoading = isLoading,
                            onClick = {
                                if (verificationCodeInput.length != 6) {
                                    errorMessage = "Ingresa el código numérico de 6 dígitos."
                                    return@ActionButton
                                }
                                coroutineScope.launch {
                                    isLoading = true
                                    errorMessage = null
                                    val response = AuthApi.verify(pendingVerificationEmail, verificationCodeInput)
                                    isLoading = false
                                    if (response.success && response.user != null) {
                                        onLoginSuccess(response.user)
                                    } else {
                                        errorMessage = response.message
                                    }
                                }
                            }
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            TextButton(
                                onClick = {
                                    coroutineScope.launch {
                                        val res = AuthApi.resendCode(pendingVerificationEmail)
                                        if (res.success) {
                                            successMessage = "Nuevo código enviado a tu correo."
                                        } else {
                                            errorMessage = res.message
                                        }
                                    }
                                }
                            ) {
                                Text(
                                    text = "Reenviar código",
                                    color = BrandAccent,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            TextButton(
                                onClick = {
                                    inVerificationMode = false
                                    errorMessage = null
                                    successMessage = null
                                }
                            ) {
                                Text(
                                    text = "Volver a inicio",
                                    color = BrandTextSecondary,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BrandedHeader() {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        val title = buildAnnotatedString {
            withStyle(SpanStyle(color = BrandTextPrimary, fontWeight = FontWeight.ExtraBold, letterSpacing = 2.sp)) {
                append("FOODLINK")
            }
            withStyle(SpanStyle(color = BrandPrimary, fontWeight = FontWeight.ExtraBold)) {
                append(".")
            }
        }
        Text(
            text = title,
            fontSize = 32.sp
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "EXPERIENCIA GASTRONOMICA 3D",
            color = BrandAccent,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 2.5.sp
        )
    }
}

@Composable
fun SegmentedTabBar(
    selectedTab: Int,
    onTabSelected: (Int) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0x14FFFFFF))
            .border(1.dp, Color(0x1AFFFFFF), RoundedCornerShape(18.dp))
            .padding(4.dp)
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            // Tab Iniciar Sesion
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (selectedTab == 0) BrandPrimary else Color.Transparent)
                    .clickable { onTabSelected(0) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "INICIAR SESION",
                    color = if (selectedTab == 0) BrandTextPrimary else BrandTextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
            }

            // Tab Registrarse
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (selectedTab == 1) BrandPrimary else Color.Transparent)
                    .clickable { onTabSelected(1) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "REGISTRARSE",
                    color = if (selectedTab == 1) BrandTextPrimary else BrandTextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
            }
        }
    }
}

@Composable
fun CustomTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    leadingIcon: androidx.compose.ui.graphics.vector.ImageVector,
    isPassword: Boolean = false,
    passwordVisible: Boolean = false,
    onTogglePasswordVisibility: (() -> Unit)? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onDone: (() -> Unit)? = null
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = { Text(placeholder, color = Color(0x4DFFFFFF), fontSize = 13.sp) },
        leadingIcon = {
            Icon(
                imageVector = leadingIcon,
                contentDescription = null,
                tint = Color(0x66FFFFFF),
                modifier = Modifier.size(18.dp)
            )
        },
        trailingIcon = if (isPassword && onTogglePasswordVisibility != null) {
            {
                IconButton(onClick = onTogglePasswordVisibility) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                        contentDescription = null,
                        tint = Color(0x66FFFFFF),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        } else null,
        visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = KeyboardActions(onDone = { onDone?.invoke() }),
        singleLine = true,
        shape = RoundedCornerShape(18.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = BrandPrimary,
            unfocusedBorderColor = Color(0x26FFFFFF),
            focusedContainerColor = Color(0x14FFFFFF),
            unfocusedContainerColor = Color(0x0AFFFFFF),
            focusedTextColor = BrandTextPrimary,
            unfocusedTextColor = BrandTextPrimary,
            cursorColor = BrandPrimary
        ),
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
fun ActionButton(
    text: String,
    isLoading: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = !isLoading,
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
        shape = RoundedCornerShape(50.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = BrandPrimary,
            contentColor = Color.White,
            disabledContainerColor = BrandPrimary.copy(alpha = 0.6f)
        )
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                color = Color.White,
                strokeWidth = 2.dp,
                modifier = Modifier.size(20.dp)
            )
        } else {
            Text(
                text = text,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )
        }
    }
}

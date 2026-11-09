package com.example.foodlink.ui.main

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.DirectionsWalk
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.GpsFixed
import androidx.compose.material.icons.filled.GpsOff
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.foodlink.data.model.OrderItem
import com.example.foodlink.data.model.PlaceItem
import com.example.foodlink.data.model.PlaceOffer
import com.example.foodlink.data.model.User
import com.example.foodlink.data.remote.PlacesRepository
import com.example.foodlink.ui.theme.BrandAccent
import com.example.foodlink.ui.theme.BrandCard
import com.example.foodlink.ui.theme.BrandCardBorder
import com.example.foodlink.ui.theme.BrandDarkBg
import com.example.foodlink.ui.theme.BrandError
import com.example.foodlink.ui.theme.BrandPrimary
import com.example.foodlink.ui.theme.BrandSuccess
import com.example.foodlink.ui.theme.BrandSuccessBg
import com.example.foodlink.ui.theme.BrandSurface
import com.example.foodlink.ui.theme.BrandTextMuted
import com.example.foodlink.ui.theme.BrandTextPrimary
import com.example.foodlink.ui.theme.BrandTextSecondary
import kotlinx.coroutines.launch

private val SageColor = Color(0xFF8AB17D)
private val SkyGpsColor = Color(0xFF38BDF8)

enum class MainBottomTab {
    EXPLORAR,
    PERFIL
}

enum class ProfileSubTab(val label: String, val icon: ImageVector) {
    CUENTA("Mi Cuenta", Icons.Default.Person),
    PEDIDOS("Pedidos QR", Icons.Default.ConfirmationNumber),
    IMPACTO("Mi Impacto", Icons.Default.Eco),
    FAVORITOS("Favoritos", Icons.Default.Favorite),
    NEGOCIO("Mi Negocio", Icons.Default.Storefront)
}

@Composable
fun FoodLinkHubScreen(
    user: User,
    onLogout: () -> Unit,
    onUpdateUserName: (String) -> Unit = {}
) {
    var bottomTab by remember { mutableStateOf(MainBottomTab.EXPLORAR) }
    var profileSubTab by remember { mutableStateOf(ProfileSubTab.CUENTA) }
    var selectedPlaceId by remember { mutableStateOf<Int?>(null) }
    var showRouteSheet by remember { mutableStateOf(false) }

    // Estado de GPS interactivo (activar / desactivar desde el mismo boton)
    var gpsActive by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var offerFilter by remember { mutableStateOf("all") }
    var categoryFilter by remember { mutableStateOf("all") }

    // Contador para refrescar recomposicion tras mutaciones en el repositorio
    var refreshTick by remember { mutableIntStateOf(0) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val showToast: (String) -> Unit = { msg ->
        scope.launch {
            snackbarHostState.currentSnackbarData?.dismiss()
            snackbarHostState.showSnackbar(msg)
        }
    }

    val activeOrdersCount = remember(refreshTick) {
        PlacesRepository.getOrders().count { it.status == "reserved" }
    }

    Scaffold(
        containerColor = BrandDarkBg,
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
        topBar = {
            FoodLinkTopBar(
                user = user,
                gpsActive = gpsActive,
                activeOrdersCount = activeOrdersCount,
                onToggleGps = {
                    gpsActive = !gpsActive
                    showToast(
                        if (gpsActive) "GPS activado y ubicacion sincronizada"
                        else "GPS desactivado. Usando tu punto de referencia manual"
                    )
                },
                onOpenProfileOrders = {
                    bottomTab = MainBottomTab.PERFIL
                    profileSubTab = if (activeOrdersCount > 0) ProfileSubTab.PEDIDOS else ProfileSubTab.CUENTA
                }
            )
        },
        bottomBar = {
            FoodLinkBottomBar(
                currentTab = bottomTab,
                activeOrdersCount = activeOrdersCount,
                onSelectTab = { tab ->
                    bottomTab = tab
                    if (tab == MainBottomTab.EXPLORAR) {
                        showRouteSheet = false
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (bottomTab) {
                MainBottomTab.EXPLORAR -> {
                    val currentPlace = remember(selectedPlaceId, refreshTick) {
                        PlacesRepository.getAllPlaces().find { it.id == selectedPlaceId }
                    }
                    if (currentPlace != null) {
                        PlaceDetailContent(
                            place = currentPlace,
                            user = user,
                            gpsActive = gpsActive,
                            showRoute = showRouteSheet,
                            refreshTick = refreshTick,
                            onBackToList = {
                                selectedPlaceId = null
                                showRouteSheet = false
                            },
                            onToggleRoute = { showRouteSheet = !showRouteSheet },
                            onToggleFavorite = {
                                val fav = PlacesRepository.toggleFavorite(currentPlace.id)
                                refreshTick++
                                showToast(
                                    if (fav) "Guardado en tus favoritos con alertas"
                                    else "Eliminado de tus favoritos"
                                )
                            },
                            onOrderCreated = { order ->
                                refreshTick++
                                showToast("Reserva confirmada: ${order.pickupCode}")
                            },
                            onOpenProfileOrders = {
                                bottomTab = MainBottomTab.PERFIL
                                profileSubTab = ProfileSubTab.PEDIDOS
                            },
                            onReviewAdded = {
                                refreshTick++
                                showToast("Gracias por publicar tu resena")
                            }
                        )
                    } else {
                        ExploreMapAndListContent(
                            gpsActive = gpsActive,
                            searchQuery = searchQuery,
                            onSearchChange = { searchQuery = it },
                            offerFilter = offerFilter,
                            onOfferFilterChange = { offerFilter = it },
                            categoryFilter = categoryFilter,
                            onCategoryFilterChange = { categoryFilter = it },
                            refreshTick = refreshTick,
                            onToggleGps = {
                                gpsActive = !gpsActive
                                showToast(
                                    if (gpsActive) "GPS activado"
                                    else "GPS desactivado"
                                )
                            },
                            onSelectPlace = { id ->
                                selectedPlaceId = id
                                showRouteSheet = false
                            },
                            onToggleFavorite = { id ->
                                val fav = PlacesRepository.toggleFavorite(id)
                                refreshTick++
                                showToast(
                                    if (fav) "Guardado en tus favoritos"
                                    else "Eliminado de favoritos"
                                )
                            },
                            onOpenProfileTab = { sub ->
                                bottomTab = MainBottomTab.PERFIL
                                profileSubTab = sub
                            }
                        )
                    }
                }

                MainBottomTab.PERFIL -> {
                    DedicatedProfileContent(
                        user = user,
                        subTab = profileSubTab,
                        onSelectSubTab = { profileSubTab = it },
                        refreshTick = refreshTick,
                        onMutate = { refreshTick++ },
                        onShowToast = showToast,
                        onOpenPlaceOnMap = { placeId, openRoute ->
                            selectedPlaceId = placeId
                            showRouteSheet = openRoute
                            bottomTab = MainBottomTab.EXPLORAR
                        },
                        onGoExplore = {
                            selectedPlaceId = null
                            bottomTab = MainBottomTab.EXPLORAR
                        },
                        onUpdateUserName = onUpdateUserName,
                        onLogout = onLogout
                    )
                }
            }
        }
    }
}

/* ============================================================================
 * BARRA SUPERIOR Y BARRA INFERIOR
 * ============================================================================ */

@Composable
private fun FoodLinkTopBar(
    user: User,
    gpsActive: Boolean,
    activeOrdersCount: Int,
    onToggleGps: () -> Unit,
    onOpenProfileOrders: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(BrandSurface)
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // Marca FOODLINK.
        Column {
            val brand = buildAnnotatedString {
                withStyle(SpanStyle(color = BrandTextPrimary, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.5.sp)) {
                    append("FOODLINK")
                }
                withStyle(SpanStyle(color = BrandPrimary, fontWeight = FontWeight.ExtraBold)) {
                    append(".")
                }
            }
            Text(text = brand, fontSize = 20.sp)
            Text(
                text = "RESCATE GASTRONOMICO",
                color = BrandTextMuted,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.4.sp
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Boton interactivo para activar y desactivar GPS desde el mismo boton
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50.dp))
                    .background(
                        if (gpsActive) SkyGpsColor.copy(alpha = 0.16f)
                        else Color(0x14FFFFFF)
                    )
                    .border(
                        1.dp,
                        if (gpsActive) SkyGpsColor.copy(alpha = 0.6f) else Color(0x26FFFFFF),
                        RoundedCornerShape(50.dp)
                    )
                    .clickable { onToggleGps() }
                    .padding(horizontal = 11.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = if (gpsActive) Icons.Default.GpsFixed else Icons.Default.GpsOff,
                    contentDescription = "Activar o desactivar GPS",
                    tint = if (gpsActive) SkyGpsColor else BrandTextSecondary,
                    modifier = Modifier.size(15.dp)
                )
                Spacer(modifier = Modifier.width(5.dp))
                Text(
                    text = if (gpsActive) "GPS ON" else "GPS OFF",
                    color = if (gpsActive) SkyGpsColor else BrandTextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Boton rapido de Mi Perfil con contador de QR activos
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50.dp))
                    .background(BrandCard)
                    .border(1.dp, BrandCardBorder, RoundedCornerShape(50.dp))
                    .clickable { onOpenProfileOrders() }
                    .padding(horizontal = 11.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = "Mi Perfil",
                    tint = BrandAccent,
                    modifier = Modifier.size(15.dp)
                )
                Spacer(modifier = Modifier.width(5.dp))
                Text(
                    text = user.name.trim().split(" ").firstOrNull() ?: "Perfil",
                    color = BrandTextPrimary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
                if (activeOrdersCount > 0) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(BrandPrimary)
                            .padding(horizontal = 5.dp, vertical = 1.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = activeOrdersCount.toString(),
                            color = Color.Black,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FoodLinkBottomBar(
    currentTab: MainBottomTab,
    activeOrdersCount: Int,
    onSelectTab: (MainBottomTab) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(BrandSurface)
            .border(1.dp, Color(0x18FFFFFF))
            .navigationBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Pestaña 1: Explorar Mapa y Lugares
        val isExplore = currentTab == MainBottomTab.EXPLORAR
        Row(
            modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(16.dp))
                .background(if (isExplore) BrandPrimary.copy(alpha = 0.2f) else Color.Transparent)
                .border(
                    1.dp,
                    if (isExplore) BrandPrimary else Color(0x18FFFFFF),
                    RoundedCornerShape(16.dp)
                )
                .clickable { onSelectTab(MainBottomTab.EXPLORAR) }
                .padding(vertical = 11.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Explore,
                contentDescription = null,
                tint = if (isExplore) BrandAccent else BrandTextSecondary,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "EXPLORAR MAPA",
                color = if (isExplore) BrandTextPrimary else BrandTextSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }

        // Pestaña 2: Seccion dedicada Mi Perfil (Cuenta, QR, Impacto, Favoritos, Negocio)
        val isProfile = currentTab == MainBottomTab.PERFIL
        Row(
            modifier = Modifier
                .weight(1f)
                .clip(RoundedCornerShape(16.dp))
                .background(if (isProfile) BrandPrimary.copy(alpha = 0.2f) else Color.Transparent)
                .border(
                    1.dp,
                    if (isProfile) BrandPrimary else Color(0x18FFFFFF),
                    RoundedCornerShape(16.dp)
                )
                .clickable { onSelectTab(MainBottomTab.PERFIL) }
                .padding(vertical = 11.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                tint = if (isProfile) BrandAccent else BrandTextSecondary,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "MI PERFIL",
                color = if (isProfile) BrandTextPrimary else BrandTextSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
            if (activeOrdersCount > 0) {
                Spacer(modifier = Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50.dp))
                        .background(BrandPrimary)
                        .padding(horizontal = 6.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = "$activeOrdersCount QR",
                        color = Color.Black,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            }
        }
    }
}

/* ============================================================================
 * SECCION 1: EXPLORAR (RADAR INTERACTIVO + FILTROS + LISTA DE LUGARES)
 * ============================================================================ */

@Composable
private fun ExploreMapAndListContent(
    gpsActive: Boolean,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    offerFilter: String,
    onOfferFilterChange: (String) -> Unit,
    categoryFilter: String,
    onCategoryFilterChange: (String) -> Unit,
    refreshTick: Int,
    onToggleGps: () -> Unit,
    onSelectPlace: (Int) -> Unit,
    onToggleFavorite: (Int) -> Unit,
    onOpenProfileTab: (ProfileSubTab) -> Unit
) {
    val places = remember(searchQuery, offerFilter, categoryFilter, refreshTick) {
        PlacesRepository.getPlaces(searchQuery, offerFilter, categoryFilter)
    }
    val favAlerts = remember(refreshTick) {
        PlacesRepository.getFavoritePlaces().filter { p ->
            p.offers.any { it.status == "active" && it.quantityLeft > 0 }
        }
    }
    val activeOrders = remember(refreshTick) {
        PlacesRepository.getOrders().filter { it.status == "reserved" }
    }

    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Radar / Mapa visual interactivo con punto azul "TU" y pines de locales
        InteractiveMapRadarCard(
            places = places,
            gpsActive = gpsActive,
            onToggleGps = onToggleGps,
            onSelectPlace = onSelectPlace
        )

        // Buscador
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            placeholder = {
                Text(
                    "Buscar fonda, panaderia, colonia o platillo...",
                    color = BrandTextMuted,
                    fontSize = 13.sp
                )
            },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = null,
                    tint = BrandAccent,
                    modifier = Modifier.size(18.dp)
                )
            },
            trailingIcon = if (searchQuery.isNotEmpty()) {
                {
                    IconButton(onClick = { onSearchChange("") }) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Limpiar",
                            tint = BrandTextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            } else null,
            singleLine = true,
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BrandPrimary,
                unfocusedBorderColor = Color(0x26FFFFFF),
                focusedContainerColor = BrandCard,
                unfocusedContainerColor = BrandCard,
                focusedTextColor = BrandTextPrimary,
                unfocusedTextColor = BrandTextPrimary
            ),
            modifier = Modifier.fillMaxWidth()
        )

        // Filtros de tipo de oferta
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val offerFilters = listOf(
                "all" to "Todo",
                "free" to "Gratis",
                "discount" to "Con descuento",
                "surprise" to "Paquete sorpresa"
            )
            for ((id, label) in offerFilters) {
                val active = offerFilter == id
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50.dp))
                        .background(if (active) BrandPrimary else BrandCard)
                        .border(
                            1.dp,
                            if (active) BrandPrimary else Color(0x22FFFFFF),
                            RoundedCornerShape(50.dp)
                        )
                        .clickable { onOfferFilterChange(id) }
                        .padding(horizontal = 14.dp, vertical = 7.dp)
                ) {
                    Text(
                        text = label,
                        color = if (active) Color.White else BrandTextSecondary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Filtros por categoria de negocio
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            val categories = listOf(
                "all" to "Todas",
                "fonda" to "Fondas",
                "panaderia" to "Panaderias",
                "puesto" to "Puestos",
                "restaurante" to "Restaurantes",
                "cafeteria" to "Cafeterias",
                "comedor" to "Comedores"
            )
            for ((id, label) in categories) {
                val active = categoryFilter == id
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50.dp))
                        .background(if (active) BrandAccent.copy(alpha = 0.2f) else Color(0x0DFFFFFF))
                        .border(
                            1.dp,
                            if (active) BrandAccent else Color(0x1AFFFFFF),
                            RoundedCornerShape(50.dp)
                        )
                        .clickable { onCategoryFilterChange(id) }
                        .padding(horizontal = 12.dp, vertical = 5.dp)
                ) {
                    Text(
                        text = label,
                        color = if (active) BrandAccent else BrandTextMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Banner de reservas QR activas (enlaza a Mi Perfil -> Pedidos QR)
        if (activeOrders.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(SageColor.copy(alpha = 0.14f))
                    .border(1.dp, SageColor.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                    .clickable { onOpenProfileTab(ProfileSubTab.PEDIDOS) }
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.QrCode2,
                        contentDescription = null,
                        tint = SageColor,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Tienes ${activeOrders.size} ${if (activeOrders.size == 1) "reserva activa con QR" else "reservas activas con QR"}",
                            color = BrandTextPrimary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Toca para abrir tu pase en Mi Perfil",
                            color = BrandTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }
                Text(
                    text = "Ver QR",
                    color = SageColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }

        // Banner de alertas de favoritos
        if (favAlerts.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(BrandAccent.copy(alpha = 0.12f))
                    .border(1.dp, BrandAccent.copy(alpha = 0.45f), RoundedCornerShape(16.dp))
                    .clickable { onOpenProfileTab(ProfileSubTab.FAVORITOS) }
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Default.NotificationsActive,
                        contentDescription = null,
                        tint = BrandAccent,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "Tus favoritos tienen comida hoy:",
                            color = BrandTextPrimary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = favAlerts.joinToString(" · ") { it.name },
                            color = BrandTextSecondary,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                Text(
                    text = "Ver",
                    color = BrandAccent,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Lista de tarjetas de lugares
        if (places.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(BrandCard)
                    .border(1.dp, Color(0x18FFFFFF), RoundedCornerShape(20.dp))
                    .padding(28.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Sin resultados con este filtro",
                        color = BrandTextPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Prueba cambiando la categoria o mostrando todas las ofertas.",
                        color = BrandTextSecondary,
                        fontSize = 12.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = {
                            onOfferFilterChange("all")
                            onCategoryFilterChange("all")
                            onSearchChange("")
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary)
                    ) {
                        Text("Quitar filtros", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            places.forEach { place ->
                PlaceCardItem(
                    place = place,
                    onClick = { onSelectPlace(place.id) },
                    onToggleFav = { onToggleFavorite(place.id) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun InteractiveMapRadarCard(
    places: List<PlaceItem>,
    gpsActive: Boolean,
    onToggleGps: () -> Unit,
    onSelectPlace: (Int) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF131B17), Color(0xFF0E1310))
                )
            )
            .border(1.dp, Color(0x28FFFFFF), RoundedCornerShape(22.dp))
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(if (gpsActive) SkyGpsColor else BrandAccent)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = if (gpsActive) "TU UBICACION ACTUAL (GPS ACTIVO)" else "TU PUNTO DE REFERENCIA MANUAL",
                        color = if (gpsActive) SkyGpsColor else BrandAccent,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.8.sp
                    )
                    Text(
                        text = "${places.size} establecimientos con comida para rescatar cerca",
                        color = BrandTextSecondary,
                        fontSize = 11.sp
                    )
                }
            }

            TextButton(onClick = onToggleGps) {
                Text(
                    text = if (gpsActive) "Desactivar GPS" else "Activar GPS",
                    color = if (gpsActive) SkyGpsColor else BrandPrimary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Pines rapidos interactivos en el radar
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            places.take(5).forEach { p ->
                val offer = p.offers.firstOrNull { it.status == "active" && it.quantityLeft > 0 }
                val badgeText = when {
                    offer == null -> p.name
                    offer.price == 0.0 -> "${p.name} · GRATIS"
                    offer.discountPercent > 0 -> "${p.name} · -${offer.discountPercent}%"
                    else -> "${p.name} · $${offer.price.toInt()}"
                }
                val pinColor = when {
                    offer?.price == 0.0 -> SageColor
                    (offer?.quantityLeft ?: 5) <= 2 -> BrandPrimary
                    else -> BrandAccent
                }
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50.dp))
                        .background(pinColor.copy(alpha = 0.16f))
                        .border(1.dp, pinColor.copy(alpha = 0.55f), RoundedCornerShape(50.dp))
                        .clickable { onSelectPlace(p.id) }
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = pinColor,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = badgeText,
                        color = BrandTextPrimary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun PlaceCardItem(
    place: PlaceItem,
    onClick: () -> Unit,
    onToggleFav: () -> Unit
) {
    val activeOffers = place.offers.filter { it.status == "active" && it.quantityLeft > 0 }
    val primaryOffer = activeOffers.firstOrNull()
    val statusColor = when {
        primaryOffer == null -> BrandTextMuted
        primaryOffer.price == 0.0 -> SageColor
        primaryOffer.quantityLeft <= 2 -> BrandPrimary
        else -> BrandAccent
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(BrandCard)
            .border(1.dp, Color(0x1FFFFFFF), RoundedCornerShape(20.dp))
            .clickable { onClick() }
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(9.dp)
                        .clip(CircleShape)
                        .background(statusColor)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = place.typeLabel.uppercase(),
                    color = BrandTextMuted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = null,
                    tint = BrandAccent,
                    modifier = Modifier.size(13.dp)
                )
                Spacer(modifier = Modifier.width(2.dp))
                Text(
                    text = "${place.ratingAvg}",
                    color = BrandAccent,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${place.distanceMeters} m · ${(place.distanceMeters / 75).coerceAtLeast(1)} min",
                    color = BrandTextSecondary,
                    fontSize = 11.sp
                )
                Spacer(modifier = Modifier.width(6.dp))
                IconButton(
                    onClick = onToggleFav,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = if (place.isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Favorito",
                        tint = if (place.isFavorite) BrandPrimary else BrandTextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = place.name,
            color = BrandTextPrimary,
            fontSize = 19.sp,
            fontWeight = FontWeight.ExtraBold
        )

        if (primaryOffer != null) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (primaryOffer.kind == "paquete_sorpresa") "Paquete sorpresa: ${primaryOffer.title}" else primaryOffer.title,
                color = BrandTextSecondary,
                fontSize = 13.sp
            )
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (primaryOffer.price == 0.0) {
                        Text(
                            text = "GRATIS",
                            color = SageColor,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    } else {
                        Text(
                            text = "$${primaryOffer.price.toInt()} MXN",
                            color = BrandAccent,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        if (primaryOffer.originalPrice > primaryOffer.price) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "$${primaryOffer.originalPrice.toInt()}",
                                color = BrandTextMuted,
                                fontSize = 12.sp,
                                textDecoration = TextDecoration.LineThrough
                            )
                        }
                        if (primaryOffer.discountPercent > 0) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50.dp))
                                    .background(BrandPrimary.copy(alpha = 0.2f))
                                    .padding(horizontal = 7.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = "-${primaryOffer.discountPercent}%",
                                    color = BrandPrimary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                Text(
                    text = "Quedan ${primaryOffer.quantityLeft}",
                    color = if (primaryOffer.quantityLeft <= 2) BrandPrimary else BrandTextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

/* ============================================================================
 * DETALLE DE LUGAR + RESERVA QR + RUTA + RESENAS
 * ============================================================================ */

@Composable
private fun PlaceDetailContent(
    place: PlaceItem,
    user: User,
    gpsActive: Boolean,
    showRoute: Boolean,
    refreshTick: Int,
    onBackToList: () -> Unit,
    onToggleRoute: () -> Unit,
    onToggleFavorite: () -> Unit,
    onOrderCreated: (OrderItem) -> Unit,
    onOpenProfileOrders: () -> Unit,
    onReviewAdded: () -> Unit
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val qtyByOffer = remember { mutableStateMapOf<Int, Int>() }
    var reviewStars by remember { mutableIntStateOf(5) }
    var reviewComment by remember { mutableStateOf("") }

    val activeOrderForPlace = remember(refreshTick, place.id) {
        PlacesRepository.getOrders().firstOrNull {
            it.businessId == place.id && it.status == "reserved"
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Cabecera volver + guardar favorito
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50.dp))
                    .background(BrandCard)
                    .clickable { onBackToList() }
                    .padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Volver",
                    tint = BrandTextPrimary,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text("Lista de lugares", color = BrandTextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50.dp))
                    .background(if (place.isFavorite) BrandPrimary.copy(alpha = 0.18f) else BrandCard)
                    .border(
                        1.dp,
                        if (place.isFavorite) BrandPrimary else Color(0x24FFFFFF),
                        RoundedCornerShape(50.dp)
                    )
                    .clickable { onToggleFavorite() }
                    .padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = if (place.isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                    contentDescription = null,
                    tint = if (place.isFavorite) BrandPrimary else BrandTextSecondary,
                    modifier = Modifier.size(15.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (place.isFavorite) "En tus favoritos" else "Guardar favorito",
                    color = if (place.isFavorite) BrandPrimary else BrandTextSecondary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Si el usuario acaba de apartar en este local, muestra confirmacion con QR y acceso a Mi Perfil
        if (activeOrderForPlace != null) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(SageColor.copy(alpha = 0.14f))
                    .border(1.dp, SageColor.copy(alpha = 0.55f), RoundedCornerShape(20.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "RESERVA LISTA · MOSTRAR EN LOCAL",
                        color = SageColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        text = activeOrderForPlace.pickupCode,
                        color = BrandAccent,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.ExtraBold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    QrCodeCanvas(
                        code = "FOODLINK:${activeOrderForPlace.pickupCode}",
                        size = 96.dp
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "${activeOrderForPlace.quantity}x ${activeOrderForPlace.offerTitle}",
                            color = BrandTextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (activeOrderForPlace.totalPrice == 0.0) "Sin costo (Gratis)"
                            else "Pagar en el local: $${activeOrderForPlace.totalPrice.toInt()} MXN",
                            color = BrandTextSecondary,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = onOpenProfileOrders,
                            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                            shape = RoundedCornerShape(50.dp)
                        ) {
                            Text("Ver en Mi Perfil (Pedidos)", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Ficha principal del establecimiento
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(BrandCard)
                .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(22.dp))
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = place.typeLabel.uppercase(),
                    color = BrandAccent,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Spacer(modifier = Modifier.width(10.dp))
                Icon(
                    imageVector = Icons.Default.Star,
                    contentDescription = null,
                    tint = BrandAccent,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(3.dp))
                Text(
                    text = "${place.ratingAvg} (${place.ratingCount} resenas)",
                    color = BrandTextSecondary,
                    fontSize = 12.sp
                )
            }

            Text(
                text = place.name,
                color = BrandTextPrimary,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold
            )

            Text(
                text = place.description,
                color = BrandTextSecondary,
                fontSize = 13.sp
            )

            HorizontalDivider(color = Color(0x18FFFFFF), modifier = Modifier.padding(vertical = 4.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, null, tint = BrandAccent, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "${place.distanceMeters} m · ${place.address}",
                    color = BrandTextPrimary,
                    fontSize = 12.sp
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Schedule, null, tint = BrandAccent, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = place.openingHours,
                    color = BrandTextSecondary,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onToggleRoute,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                    shape = RoundedCornerShape(50.dp)
                ) {
                    Icon(Icons.Default.Route, null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (showRoute) "Ocultar indicaciones" else "Como llegar",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                OutlinedButton(
                    onClick = {
                        val uri = Uri.parse("geo:${place.lat},${place.lng}?q=${place.lat},${place.lng}(${Uri.encode(place.name)})")
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        runCatching { context.startActivity(intent) }
                    },
                    shape = RoundedCornerShape(50.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
                ) {
                    Text("Abrir GPS", color = BrandTextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Tarjeta de ruta paso a paso dentro de la app
        if (showRoute) {
            val walkMin = (place.distanceMeters / 75).coerceAtLeast(1)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color(0xFF151D19))
                    .border(1.dp, BrandAccent.copy(alpha = 0.45f), RoundedCornerShape(20.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.AutoMirrored.Filled.DirectionsWalk, null, tint = BrandAccent, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "$walkMin min a pie (${place.distanceMeters} m)",
                            color = BrandTextPrimary,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }
                    Text(
                        text = if (gpsActive) "Desde tu GPS" else "Desde tu punto",
                        color = SkyGpsColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = "1. Sal desde tu ubicacion actual y avanza ${(place.distanceMeters * 0.45).toInt()} m por la avenida principal.",
                    color = BrandTextSecondary,
                    fontSize = 12.sp
                )
                Text(
                    text = "2. Gira en direccion a ${place.address} y continua ${(place.distanceMeters * 0.55).toInt()} m.",
                    color = BrandTextSecondary,
                    fontSize = 12.sp
                )
                Text(
                    text = "3. Llegas a ${place.name}. Muestra tu codigo QR en mostrador y realiza ahi tu pago.",
                    color = SageColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Ofertas para rescatar hoy
        Text(
            text = "OFERTAS PARA RESCATAR HOY",
            color = BrandTextMuted,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp
        )

        val activeOffers = place.offers.filter { it.status == "active" && it.quantityLeft > 0 }
        if (activeOffers.isEmpty()) {
            Text(
                text = "Por ahora se agotaron las ofertas de hoy en este establecimiento.",
                color = BrandTextSecondary,
                fontSize = 13.sp
            )
        } else {
            activeOffers.forEach { offer ->
                val selectedQty = (qtyByOffer[offer.id] ?: 1).coerceIn(1, offer.quantityLeft)
                val totalToPay = offer.price * selectedQty

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(BrandCard)
                        .border(1.dp, BrandCardBorder, RoundedCornerShape(18.dp))
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = offer.title,
                            color = BrandTextPrimary,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            text = "Quedan ${offer.quantityLeft}",
                            color = if (offer.quantityLeft <= 2) BrandPrimary else SageColor,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    if (offer.description.isNotEmpty()) {
                        Text(text = offer.description, color = BrandTextSecondary, fontSize = 12.sp)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = if (offer.price == 0.0) "GRATIS" else "$${offer.price.toInt()} MXN",
                            color = if (offer.price == 0.0) SageColor else BrandAccent,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        if (offer.originalPrice > offer.price) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Antes $${offer.originalPrice.toInt()}",
                                color = BrandTextMuted,
                                fontSize = 12.sp,
                                textDecoration = TextDecoration.LineThrough
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "· ${offer.pickupWindow}",
                            color = BrandTextSecondary,
                            fontSize = 11.sp
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Selector de cantidad
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(50.dp))
                                .background(Color(0x14FFFFFF))
                                .border(1.dp, Color(0x28FFFFFF), RoundedCornerShape(50.dp)),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = {
                                    qtyByOffer[offer.id] = (selectedQty - 1).coerceAtLeast(1)
                                },
                                modifier = Modifier.size(34.dp)
                            ) {
                                Icon(Icons.Default.Remove, null, tint = BrandTextPrimary, modifier = Modifier.size(15.dp))
                            }
                            Text(
                                text = selectedQty.toString(),
                                color = BrandTextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp)
                            )
                            IconButton(
                                onClick = {
                                    qtyByOffer[offer.id] = (selectedQty + 1).coerceAtMost(offer.quantityLeft)
                                },
                                modifier = Modifier.size(34.dp)
                            ) {
                                Icon(Icons.Default.Add, null, tint = BrandTextPrimary, modifier = Modifier.size(15.dp))
                            }
                        }

                        Button(
                            onClick = {
                                val res = PlacesRepository.reserveOffer(
                                    offerId = offer.id,
                                    quantity = selectedQty,
                                    userEmail = user.email,
                                    userName = user.name
                                )
                                res.onSuccess { ord -> onOrderCreated(ord) }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                            shape = RoundedCornerShape(50.dp)
                        ) {
                            Icon(Icons.Default.QrCode2, null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = if (totalToPay == 0.0) "Apartar con QR · Gratis"
                                else "Apartar con QR · $${totalToPay.toInt()}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // Resenas de la comunidad
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(BrandCard)
                .border(1.dp, Color(0x1FFFFFFF), RoundedCornerShape(20.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "RESENAS DE LA COMUNIDAD (${place.reviews.size})",
                color = BrandTextMuted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Tu calificacion:", color = BrandTextSecondary, fontSize = 12.sp)
                Spacer(modifier = Modifier.width(8.dp))
                (1..5).forEach { s ->
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = "$s estrellas",
                        tint = if (s <= reviewStars) BrandAccent else Color(0x33FFFFFF),
                        modifier = Modifier
                            .size(22.dp)
                            .clickable { reviewStars = s }
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = reviewComment,
                    onValueChange = { reviewComment = it },
                    placeholder = { Text("Escribe tu opinion sobre este local...", fontSize = 12.sp, color = BrandTextMuted) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.weight(1f),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BrandPrimary,
                        unfocusedBorderColor = Color(0x24FFFFFF),
                        focusedTextColor = BrandTextPrimary,
                        unfocusedTextColor = BrandTextPrimary
                    )
                )
                Button(
                    onClick = {
                        if (reviewComment.isNotBlank()) {
                            PlacesRepository.addReview(place.id, user.name, reviewStars, reviewComment)
                            reviewComment = ""
                            onReviewAdded()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Publicar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            place.reviews.forEach { r ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0x0DFFFFFF))
                        .padding(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(r.userName, color = BrandTextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text("${r.stars} / 5", color = BrandAccent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(r.comment, color = BrandTextSecondary, fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

/* ============================================================================
 * SECCION 2: MI PERFIL DEDICADO (CUENTA, PEDIDOS QR, IMPACTO, FAVORITOS, NEGOCIO)
 * ============================================================================ */

@Composable
private fun DedicatedProfileContent(
    user: User,
    subTab: ProfileSubTab,
    onSelectSubTab: (ProfileSubTab) -> Unit,
    refreshTick: Int,
    onMutate: () -> Unit,
    onShowToast: (String) -> Unit,
    onOpenPlaceOnMap: (Int, Boolean) -> Unit,
    onGoExplore: () -> Unit,
    onUpdateUserName: (String) -> Unit,
    onLogout: () -> Unit
) {
    val orders = remember(refreshTick) { PlacesRepository.getOrders() }
    val impact = remember(refreshTick) { PlacesRepository.computeImpact() }
    val favPlaces = remember(refreshTick) { PlacesRepository.getFavoritePlaces() }
    val allPlaces = remember(refreshTick) { PlacesRepository.getAllPlaces() }

    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Sub-navegacion de la seccion Mi Perfil
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ProfileSubTab.entries.forEach { item ->
                val selected = subTab == item
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50.dp))
                        .background(if (selected) BrandPrimary else BrandCard)
                        .border(
                            1.dp,
                            if (selected) BrandPrimary else Color(0x24FFFFFF),
                            RoundedCornerShape(50.dp)
                        )
                        .clickable { onSelectSubTab(item) }
                        .padding(horizontal = 14.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = item.icon,
                        contentDescription = null,
                        tint = if (selected) Color.White else BrandAccent,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = item.label,
                        color = if (selected) Color.White else BrandTextPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        when (subTab) {
            ProfileSubTab.CUENTA -> ProfileAccountSubSection(
                user = user,
                activeOrdersCount = orders.count { it.status == "reserved" },
                kgSaved = impact.kgSaved,
                favCount = favPlaces.size,
                levelTitle = impact.levelTitle,
                onOpenOrders = { onSelectSubTab(ProfileSubTab.PEDIDOS) },
                onUpdateUserName = { newName ->
                    onUpdateUserName(newName)
                    onShowToast("Perfil actualizado correctamente")
                },
                onLogout = onLogout
            )

            ProfileSubTab.PEDIDOS -> ProfileOrdersQrSubSection(
                orders = orders,
                onGoExplore = onGoExplore,
                onOpenPlaceRoute = { bizId -> onOpenPlaceOnMap(bizId, true) },
                onMarkPickedUp = { code ->
                    PlacesRepository.redeemOrderByCode(code)
                        .onSuccess {
                            onMutate()
                            onShowToast("Pedido marcado como recogido")
                        }
                        .onFailure { err -> onShowToast(err.message ?: "Error") }
                },
                onCancelOrder = { orderId ->
                    if (PlacesRepository.cancelOrder(orderId)) {
                        onMutate()
                        onShowToast("Reserva cancelada y unidades liberadas")
                    }
                }
            )

            ProfileSubTab.IMPACTO -> ProfileImpactSubSection(impact = impact)

            ProfileSubTab.FAVORITOS -> ProfileFavoritesSubSection(
                favorites = favPlaces,
                onGoExplore = onGoExplore,
                onOpenPlace = { bizId -> onOpenPlaceOnMap(bizId, false) },
                onRemoveFavorite = { bizId ->
                    PlacesRepository.toggleFavorite(bizId)
                    onMutate()
                    onShowToast("Eliminado de tus favoritos")
                }
            )

            ProfileSubTab.NEGOCIO -> ProfileBusinessSubSection(
                places = allPlaces,
                orders = orders,
                onMutate = onMutate,
                onShowToast = onShowToast
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ProfileAccountSubSection(
    user: User,
    activeOrdersCount: Int,
    kgSaved: Double,
    favCount: Int,
    levelTitle: String,
    onOpenOrders: () -> Unit,
    onUpdateUserName: (String) -> Unit,
    onLogout: () -> Unit
) {
    val firstName = user.name.trim().split(" ").firstOrNull() ?: user.name
    var editableName by remember(user.name) { mutableStateOf(user.name) }
    val selectedTags = remember { mutableStateListOf("Sin restricciones", "Comida corrida casera") }
    val allTags = listOf(
        "Sin restricciones",
        "Vegetariano",
        "Vegano",
        "Sin gluten",
        "Panaderia y dulce",
        "Comida corrida casera"
    )

    // Tarjeta principal de perfil "Hola, [nombre]"
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(24.dp))
            .background(BrandCard)
            .border(1.dp, BrandCardBorder, RoundedCornerShape(24.dp))
            .padding(22.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(68.dp)
                .clip(CircleShape)
                .background(Color(0x33E86A33))
                .border(2.dp, BrandPrimary, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = (user.name.firstOrNull() ?: 'U').uppercase(),
                color = BrandAccent,
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "Hola, $firstName",
            color = BrandTextPrimary,
            fontSize = 26.sp,
            fontWeight = FontWeight.ExtraBold
        )
        Text(
            text = user.email,
            color = BrandTextSecondary,
            fontSize = 13.sp
        )

        Spacer(modifier = Modifier.height(10.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50.dp))
                    .background(BrandSuccessBg)
                    .border(1.dp, BrandSuccess.copy(alpha = 0.5f), RoundedCornerShape(50.dp))
                    .padding(horizontal = 12.dp, vertical = 5.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.CheckCircle, null, tint = BrandSuccess, modifier = Modifier.size(13.dp))
                Spacer(modifier = Modifier.width(5.dp))
                Text(
                    text = if (user.isVerified) "VERIFICADO" else "CUENTA ACTIVA",
                    color = BrandSuccess,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50.dp))
                    .background(BrandAccent.copy(alpha = 0.16f))
                    .border(1.dp, BrandAccent.copy(alpha = 0.5f), RoundedCornerShape(50.dp))
                    .padding(horizontal = 12.dp, vertical = 5.dp)
            ) {
                Text(
                    text = levelTitle.uppercase(),
                    color = BrandAccent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // Mini metricas rapidas
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            MiniStatCard(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onOpenOrders() },
                value = activeOrdersCount.toString(),
                label = "QR activos"
            )
            MiniStatCard(
                modifier = Modifier.weight(1f),
                value = "$kgSaved kg",
                label = "Salvados"
            )
            MiniStatCard(
                modifier = Modifier.weight(1f),
                value = favCount.toString(),
                label = "Favoritos"
            )
        }
    }

    // Preferencias de comensal
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(BrandCard)
            .border(1.dp, Color(0x1FFFFFFF), RoundedCornerShape(22.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "PREFERENCIAS Y ALIAS DE RECOGIDA",
            color = BrandAccent,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )

        OutlinedTextField(
            value = editableName,
            onValueChange = { editableName = it },
            label = { Text("Nombre en tus tickets QR", color = BrandTextSecondary, fontSize = 12.sp) },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = BrandPrimary,
                unfocusedBorderColor = Color(0x28FFFFFF),
                focusedTextColor = BrandTextPrimary,
                unfocusedTextColor = BrandTextPrimary
            ),
            modifier = Modifier.fillMaxWidth()
        )

        Text(
            text = "Etiquetas alimentarias preferidas:",
            color = BrandTextSecondary,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            allTags.forEach { tag ->
                val isSelected = selectedTags.contains(tag)
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50.dp))
                        .background(if (isSelected) SageColor.copy(alpha = 0.2f) else Color(0x12FFFFFF))
                        .border(
                            1.dp,
                            if (isSelected) SageColor else Color(0x24FFFFFF),
                            RoundedCornerShape(50.dp)
                        )
                        .clickable {
                            if (isSelected && selectedTags.size > 1) selectedTags.remove(tag)
                            else if (!isSelected) selectedTags.add(tag)
                        }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = tag,
                        color = if (isSelected) SageColor else BrandTextSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Button(
                onClick = {
                    if (editableName.isNotBlank()) {
                        onUpdateUserName(editableName.trim())
                    }
                },
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                shape = RoundedCornerShape(50.dp)
            ) {
                Text("Guardar cambios", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            OutlinedButton(
                onClick = onLogout,
                shape = RoundedCornerShape(50.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
            ) {
                Icon(Icons.AutoMirrored.Filled.ExitToApp, null, tint = BrandTextSecondary, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Cerrar sesion", color = BrandTextSecondary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun MiniStatCard(
    modifier: Modifier = Modifier,
    value: String,
    label: String
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x12FFFFFF))
            .border(1.dp, Color(0x1FFFFFFF), RoundedCornerShape(14.dp))
            .padding(vertical = 10.dp, horizontal = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = value,
            color = BrandAccent,
            fontSize = 18.sp,
            fontWeight = FontWeight.ExtraBold
        )
        Text(
            text = label,
            color = BrandTextMuted,
            fontSize = 11.sp
        )
    }
}

@Composable
private fun ProfileOrdersQrSubSection(
    orders: List<OrderItem>,
    onGoExplore: () -> Unit,
    onOpenPlaceRoute: (Int) -> Unit,
    onMarkPickedUp: (String) -> Unit,
    onCancelOrder: (Int) -> Unit
) {
    if (orders.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(BrandCard)
                .border(1.dp, Color(0x1FFFFFFF), RoundedCornerShape(22.dp))
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(Icons.Default.ConfirmationNumber, null, tint = BrandAccent, modifier = Modifier.size(38.dp))
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = "Aun no tienes reservas con QR",
                color = BrandTextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Aparta cualquier paquete sorpresa o comida del dia en la pestaña Explorar. No pagas en linea: pagas directo en el local al presentar tu QR.",
                color = BrandTextSecondary,
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(14.dp))
            Button(
                onClick = onGoExplore,
                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                shape = RoundedCornerShape(50.dp)
            ) {
                Text("Explorar comida cerca", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
        return
    }

    orders.forEach { ord ->
        val isReserved = ord.status == "reserved"
        val isPicked = ord.status == "picked_up"
        val statusText = when {
            isReserved -> "ACTIVO · MOSTRAR EN LOCAL"
            isPicked -> "ENTREGADO"
            else -> "CANCELADO"
        }
        val statusColor = when {
            isReserved -> SageColor
            isPicked -> BrandAccent
            else -> BrandTextMuted
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(BrandCard)
                .border(
                    1.dp,
                    if (isReserved) SageColor.copy(alpha = 0.55f) else Color(0x22FFFFFF),
                    RoundedCornerShape(22.dp)
                )
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = statusText,
                    color = statusColor,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 0.8.sp
                )
                Text(
                    text = ord.pickupCode,
                    color = BrandAccent,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    fontFamily = FontFamily.Monospace
                )
            }

            Text(
                text = ord.businessName,
                color = BrandTextPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold
            )
            Text(
                text = "${ord.quantity}x ${ord.offerTitle}",
                color = BrandTextPrimary,
                fontSize = 14.sp
            )
            Text(
                text = if (ord.totalPrice == 0.0) "Sin costo (Gratis) · ~${ord.estWeightKg} kg rescatados"
                else "Pagar en el establecimiento: $${ord.totalPrice.toInt()} MXN · ~${ord.estWeightKg} kg",
                color = BrandTextSecondary,
                fontSize = 12.sp
            )

            if (isReserved) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFF0E1210))
                        .border(1.dp, BrandAccent.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    QrCodeCanvas(
                        code = "FOODLINK:${ord.pickupCode}",
                        size = 112.dp
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "CODIGO DE ENTREGA",
                            color = BrandTextMuted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = ord.pickupCode,
                            color = BrandAccent,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            fontFamily = FontFamily.Monospace
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${ord.pickupWindow} en ${ord.businessAddress}",
                            color = BrandTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = { onOpenPlaceRoute(ord.businessId) },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                        shape = RoundedCornerShape(50.dp)
                    ) {
                        Text("Como llegar", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    OutlinedButton(
                        onClick = { onMarkPickedUp(ord.pickupCode) },
                        shape = RoundedCornerShape(50.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SageColor)
                    ) {
                        Text("Ya lo recogi", color = SageColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = { onCancelOrder(ord.id) }) {
                        Text("Cancelar", color = BrandError, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileImpactSubSection(
    impact: com.example.foodlink.data.model.ImpactSummary
) {
    // Banner de nivel actual y barra de progreso
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(BrandAccent.copy(alpha = 0.18f), SageColor.copy(alpha = 0.14f))
                )
            )
            .border(1.dp, BrandAccent.copy(alpha = 0.45f), RoundedCornerShape(22.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "RANGO ECOLOGICO ACTUAL",
                    color = BrandAccent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = impact.levelTitle,
                    color = BrandTextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
            Text(
                text = "${impact.rescuesCount} rescates",
                color = SageColor,
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold
            )
        }

        // Barra de progreso
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(9.dp)
                .clip(RoundedCornerShape(50.dp))
                .background(Color(0x22FFFFFF))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(fraction = (impact.levelProgressPercent / 100f).coerceIn(0.06f, 1f))
                    .height(9.dp)
                    .clip(RoundedCornerShape(50.dp))
                    .background(Brush.horizontalGradient(listOf(BrandPrimary, BrandAccent, SageColor)))
            )
        }

        Text(
            text = "Siguiente nivel: ${impact.nextLevelTitle} (${impact.rescuesCount}/${impact.nextLevelTarget} porciones)",
            color = BrandTextSecondary,
            fontSize = 12.sp
        )
    }

    // Cuadricula 2x2 de metricas ambientales y de ahorro
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        ImpactStatBox(
            modifier = Modifier.weight(1f),
            value = "${impact.kgSaved} kg",
            label = "Comida salvada de tirarse"
        )
        ImpactStatBox(
            modifier = Modifier.weight(1f),
            value = "${impact.co2AvoidedKg} kg",
            label = "Emisiones CO2 evitadas"
        )
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        ImpactStatBox(
            modifier = Modifier.weight(1f),
            value = "$${impact.moneySavedMxn} MXN",
            label = "Ahorro estimado acumulado"
        )
        ImpactStatBox(
            modifier = Modifier.weight(1f),
            value = "${impact.waterLiters} L",
            label = "Agua potable preservada"
        )
    }

    // Insignias desbloqueables
    Text(
        text = "INSIGNIAS DE RESCATE (${impact.badges.count { it.unlocked }}/${impact.badges.size})",
        color = BrandTextMuted,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp
    )

    impact.badges.forEach { badge ->
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(if (badge.unlocked) SageColor.copy(alpha = 0.14f) else BrandCard)
                .border(
                    1.dp,
                    if (badge.unlocked) SageColor.copy(alpha = 0.55f) else Color(0x1FFFFFFF),
                    RoundedCornerShape(16.dp)
                )
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.weight(1f)
            ) {
                Icon(
                    imageVector = Icons.Default.EmojiEvents,
                    contentDescription = null,
                    tint = if (badge.unlocked) SageColor else BrandTextMuted,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = badge.title,
                        color = BrandTextPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = badge.description,
                        color = BrandTextSecondary,
                        fontSize = 12.sp
                    )
                }
            }
            Text(
                text = if (badge.unlocked) "LOGRADO" else "PENDIENTE",
                color = if (badge.unlocked) SageColor else BrandTextMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold
            )
        }
    }
}

@Composable
private fun ImpactStatBox(
    modifier: Modifier = Modifier,
    value: String,
    label: String
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(BrandCard)
            .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Text(
            text = value,
            color = BrandAccent,
            fontSize = 22.sp,
            fontWeight = FontWeight.ExtraBold
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            color = BrandTextSecondary,
            fontSize = 12.sp
        )
    }
}

@Composable
private fun ProfileFavoritesSubSection(
    favorites: List<PlaceItem>,
    onGoExplore: () -> Unit,
    onOpenPlace: (Int) -> Unit,
    onRemoveFavorite: (Int) -> Unit
) {
    if (favorites.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(BrandCard)
                .border(1.dp, Color(0x1FFFFFFF), RoundedCornerShape(22.dp))
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(Icons.Default.FavoriteBorder, null, tint = BrandPrimary, modifier = Modifier.size(36.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Aun no tienes locales favoritos",
                color = BrandTextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Toca el icono de corazon en cualquier establecimiento para recibir alertas cuando publique ofertas.",
                color = BrandTextSecondary,
                fontSize = 12.sp
            )
            Spacer(modifier = Modifier.height(14.dp))
            Button(
                onClick = onGoExplore,
                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                shape = RoundedCornerShape(50.dp)
            ) {
                Text("Explorar lugares", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
        return
    }

    favorites.forEach { place ->
        val activeOffer = place.offers.firstOrNull { it.status == "active" && it.quantityLeft > 0 }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(BrandCard)
                .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(18.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = place.typeLabel.uppercase(),
                    color = BrandAccent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${place.distanceMeters} m · ${place.ratingAvg} / 5",
                    color = BrandTextSecondary,
                    fontSize = 11.sp
                )
            }
            Text(
                text = place.name,
                color = BrandTextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold
            )
            if (activeOffer != null) {
                Text(
                    text = "Disponible hoy: ${activeOffer.title} (${if (activeOffer.price == 0.0) "Gratis" else "$${activeOffer.price.toInt()} MXN"})",
                    color = SageColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { onOpenPlace(place.id) },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                    shape = RoundedCornerShape(50.dp)
                ) {
                    Text("Ver ofertas y mapa", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
                OutlinedButton(
                    onClick = { onRemoveFavorite(place.id) },
                    shape = RoundedCornerShape(50.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
                ) {
                    Text("Quitar", color = BrandTextSecondary, fontSize = 11.sp)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ProfileBusinessSubSection(
    places: List<PlaceItem>,
    orders: List<OrderItem>,
    onMutate: () -> Unit,
    onShowToast: (String) -> Unit
) {
    var selectedBizId by remember { mutableIntStateOf(places.firstOrNull()?.id ?: 1) }
    val managedBiz = places.find { it.id == selectedBizId } ?: places.firstOrNull()

    var showNewBizForm by remember { mutableStateOf(false) }
    var newBizName by remember { mutableStateOf("") }
    var newBizAddress by remember { mutableStateOf("") }
    var newBizPhone by remember { mutableStateOf("") }

    var redeemCodeInput by remember { mutableStateOf("") }

    // Campos de publicacion rapida de oferta
    var offerTitle by remember { mutableStateOf("") }
    var offerOriginalPrice by remember { mutableStateOf("110") }
    var offerRescuePrice by remember { mutableStateOf("40") }
    var offerQty by remember { mutableStateOf("5") }
    var offerTags by remember { mutableStateOf("casero, al cierre") }

    // Cabecera y selector de local
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(BrandCard)
            .border(1.dp, BrandCardBorder, RoundedCornerShape(22.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "PANEL PARA COMERCIOS ALIADOS",
                    color = BrandAccent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = managedBiz?.name ?: "Mi Negocio",
                    color = BrandTextPrimary,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }
            TextButton(onClick = { showNewBizForm = !showNewBizForm }) {
                Text(
                    text = if (showNewBizForm) "Cancelar" else "+ Nuevo local",
                    color = BrandPrimary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // Selector horizontal de negocio administrado
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            places.forEach { b ->
                val isSelected = b.id == managedBiz?.id
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50.dp))
                        .background(if (isSelected) BrandAccent.copy(alpha = 0.22f) else Color(0x12FFFFFF))
                        .border(
                            1.dp,
                            if (isSelected) BrandAccent else Color(0x22FFFFFF),
                            RoundedCornerShape(50.dp)
                        )
                        .clickable { selectedBizId = b.id }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = b.name,
                        color = if (isSelected) BrandAccent else BrandTextSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        if (showNewBizForm) {
            HorizontalDivider(color = Color(0x18FFFFFF))
            Text("Registrar nuevo establecimiento en el mapa", color = BrandTextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            OutlinedTextField(
                value = newBizName,
                onValueChange = { newBizName = it },
                placeholder = { Text("Nombre del negocio (ej. Fonda Santa Clara)", fontSize = 12.sp) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = newBizAddress,
                onValueChange = { newBizAddress = it },
                placeholder = { Text("Direccion (Calle, numero y colonia)", fontSize = 12.sp) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = newBizPhone,
                onValueChange = { newBizPhone = it },
                placeholder = { Text("Telefono de contacto", fontSize = 12.sp) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )
            Button(
                onClick = {
                    if (newBizName.isNotBlank()) {
                        val created = PlacesRepository.registerNewBusiness(
                            name = newBizName,
                            type = "fonda",
                            address = newBizAddress,
                            phone = newBizPhone,
                            openingHours = "Lun-Sab 9:00-21:00",
                            description = "Comida del dia para rescatar."
                        )
                        selectedBizId = created.id
                        newBizName = ""
                        newBizAddress = ""
                        newBizPhone = ""
                        showNewBizForm = false
                        onMutate()
                        onShowToast("Negocio ${created.name} registrado en el mapa")
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                shape = RoundedCornerShape(50.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Guardar y colocar en el mapa", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }

    // Validador de codigo QR de clientes
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(BrandCard)
            .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(22.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = "VALIDAR CODIGO QR DE CLIENTE",
            color = BrandAccent,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = redeemCodeInput,
                onValueChange = { redeemCodeInput = it.uppercase() },
                placeholder = { Text("Ej. FL-7K4M92", fontSize = 12.sp, color = BrandTextMuted) },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.weight(1f),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BrandPrimary,
                    unfocusedBorderColor = Color(0x28FFFFFF),
                    focusedTextColor = BrandTextPrimary,
                    unfocusedTextColor = BrandTextPrimary
                )
            )
            Button(
                onClick = {
                    if (redeemCodeInput.isNotBlank()) {
                        PlacesRepository.redeemOrderByCode(redeemCodeInput)
                            .onSuccess { ord ->
                                redeemCodeInput = ""
                                onMutate()
                                onShowToast("Entrega validada: ${ord.quantity}x ${ord.offerTitle}")
                            }
                            .onFailure { err ->
                                onShowToast(err.message ?: "Codigo no encontrado")
                            }
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text("Canjear QR", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }

        val pendingForBiz = orders.filter { it.status == "reserved" }
        if (pendingForBiz.isNotEmpty()) {
            Text(
                text = "Reservas pendientes de recoger (${pendingForBiz.size}):",
                color = BrandTextSecondary,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
            pendingForBiz.forEach { ord ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0x12FFFFFF))
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "${ord.pickupCode} · ${ord.quantity}x ${ord.offerTitle}",
                            color = BrandTextPrimary,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${ord.userName} · ${if (ord.totalPrice == 0.0) "Gratis" else "Cobrar $${ord.totalPrice.toInt()} MXN"}",
                            color = BrandTextSecondary,
                            fontSize = 11.sp
                        )
                    }
                    Button(
                        onClick = {
                            PlacesRepository.redeemOrderByCode(ord.pickupCode)
                                .onSuccess {
                                    onMutate()
                                    onShowToast("Pedido ${ord.pickupCode} entregado")
                                }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = SageColor),
                        shape = RoundedCornerShape(50.dp)
                    ) {
                        Text("Entregar", color = Color.Black, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
        }
    }

    // Publicar oferta en 20 segundos con plantillas rapidas
    if (managedBiz != null) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(BrandCard)
                .border(1.dp, Color(0x22FFFFFF), RoundedCornerShape(22.dp))
                .padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Bolt, null, tint = BrandAccent, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "PUBLICAR OFERTA EN 20 SEGUNDOS",
                    color = BrandAccent,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }

            Text(
                text = "Toca una plantilla rapida para rellenar los campos:",
                color = BrandTextSecondary,
                fontSize = 12.sp
            )

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                PlacesRepository.quickTemplates.forEach { tpl ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0x14FFFFFF))
                            .border(1.dp, Color(0x28FFFFFF), RoundedCornerShape(12.dp))
                            .clickable {
                                offerTitle = tpl.title
                                offerOriginalPrice = tpl.originalPrice.toString()
                                offerRescuePrice = tpl.price.toString()
                                offerQty = tpl.quantityTotal.toString()
                                offerTags = tpl.tags
                                onShowToast("Plantilla cargada: ${tpl.label}")
                            }
                            .padding(horizontal = 11.dp, vertical = 7.dp)
                    ) {
                        Text(
                            text = tpl.label,
                            color = BrandTextPrimary,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            OutlinedTextField(
                value = offerTitle,
                onValueChange = { offerTitle = it },
                label = { Text("Titulo de la oferta o paquete", fontSize = 12.sp) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = offerOriginalPrice,
                    onValueChange = { offerOriginalPrice = it },
                    label = { Text("Precio normal $", fontSize = 11.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = offerRescuePrice,
                    onValueChange = { offerRescuePrice = it },
                    label = { Text("Precio rescate $", fontSize = 11.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = offerQty,
                    onValueChange = { offerQty = it },
                    label = { Text("Unidades", fontSize = 11.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(0.9f)
                )
            }

            Button(
                onClick = {
                    if (offerTitle.isBlank()) {
                        onShowToast("Escribe el titulo de la oferta o elige una plantilla")
                        return@Button
                    }
                    PlacesRepository.publishOffer(
                        businessId = managedBiz.id,
                        title = offerTitle,
                        kind = "paquete_sorpresa",
                        originalPrice = offerOriginalPrice.toDoubleOrNull() ?: 100.0,
                        price = offerRescuePrice.toDoubleOrNull() ?: 35.0,
                        quantityTotal = offerQty.toIntOrNull() ?: 5,
                        pickupHours = 3.0,
                        estWeightKg = 0.70,
                        tags = offerTags,
                        allergens = ""
                    )
                    offerTitle = ""
                    onMutate()
                    onShowToast("Oferta publicada en ${managedBiz.name}")
                },
                colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                shape = RoundedCornerShape(50.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Publicar oferta ahora en el mapa", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/* ============================================================================
 * GENERADOR VISUAL DE CODIGO QR EN COMPOSE CANVAS (21x21)
 * ============================================================================ */

@Composable
fun QrCodeCanvas(
    code: String,
    size: Dp = 116.dp
) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF5F2EB))
            .padding(8.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val modules = 21
            val cell = this.size.width / modules
            val ink = Color(0xFF0A0C0B)

            fun drawFinder(row0: Int, col0: Int) {
                for (r in 0..6) {
                    for (c in 0..6) {
                        val isBorder = r == 0 || r == 6 || c == 0 || c == 6
                        val isInner = r in 2..4 && c in 2..4
                        if (isBorder || isInner) {
                            drawRect(
                                color = ink,
                                topLeft = Offset((col0 + c) * cell, (row0 + r) * cell),
                                size = Size(cell * 1.02f, cell * 1.02f)
                            )
                        }
                    }
                }
            }

            drawFinder(0, 0)
            drawFinder(0, modules - 7)
            drawFinder(modules - 7, 0)

            // Patrones de sincronizacion (timing patterns)
            for (i in 8 until modules - 8) {
                if (i % 2 == 0) {
                    drawRect(
                        color = ink,
                        topLeft = Offset(i * cell, 6 * cell),
                        size = Size(cell, cell)
                    )
                    drawRect(
                        color = ink,
                        topLeft = Offset(6 * cell, i * cell),
                        size = Size(cell, cell)
                    )
                }
            }

            // Modulos deterministas derivados del codigo de reserva
            val seed = code.hashCode()
            for (r in 0 until modules) {
                for (c in 0 until modules) {
                    val inTopLeft = r < 8 && c < 8
                    val inTopRight = r < 8 && c >= modules - 8
                    val inBottomLeft = r >= modules - 8 && c < 8
                    val isTiming = r == 6 || c == 6
                    if (inTopLeft || inTopRight || inBottomLeft || isTiming) continue

                    val hash = (seed xor (r * 37 + c * 101) xor (code[(r + c) % code.length].code * 17))
                    if ((hash and 1) == 0) {
                        drawRect(
                            color = ink,
                            topLeft = Offset(c * cell, r * cell),
                            size = Size(cell * 1.02f, cell * 1.02f)
                        )
                    }
                }
            }

            drawRect(
                color = ink.copy(alpha = 0.08f),
                topLeft = Offset.Zero,
                size = this.size,
                style = Stroke(width = 1f)
            )
        }
    }
}

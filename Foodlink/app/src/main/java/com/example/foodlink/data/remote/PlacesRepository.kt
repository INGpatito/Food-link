package com.example.foodlink.data.remote

import com.example.foodlink.data.model.ImpactBadge
import com.example.foodlink.data.model.ImpactSummary
import com.example.foodlink.data.model.OrderItem
import com.example.foodlink.data.model.PlaceItem
import com.example.foodlink.data.model.PlaceOffer
import com.example.foodlink.data.model.PlaceReview
import com.example.foodlink.data.model.QuickOfferTemplate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.random.Random

/**
 * Repositorio conectado en tiempo real con https://papoys.me/api/places
 * para sincronizar lugares, ofertas de rescate, reservas con QR (FL-XXXXXX),
 * favoritos, resenas, impacto ambiental, preferencias y panel de negocio
 * entre la plataforma web y la aplicacion Android.
 */
object PlacesRepository {

    private const val BASE_URL = "https://papoys.me/api/places"
    private const val TIMEOUT_MS = 10000

    @Volatile
    var currentUserEmail: String = ""

    @Volatile
    var currentLat: Double = 19.4326

    @Volatile
    var currentLng: Double = -99.1332

    private val userDietTags = mutableListOf("Sin restricciones", "Comida corrida casera")

    val quickTemplates = listOf(
        QuickOfferTemplate(
            id = "surprise_close",
            label = "Bolsa sorpresa al cierre",
            title = "Paquete sorpresa del cierre",
            kind = "paquete_sorpresa",
            originalPrice = 130,
            price = 45,
            quantityTotal = 5,
            pickupHours = 3.0,
            estWeightKg = 0.75,
            tags = "sorpresa, al cierre",
            allergens = "Consultar en mostrador"
        ),
        QuickOfferTemplate(
            id = "daily_meal",
            label = "Comida corrida del dia",
            title = "Comida corrida completa para llevar",
            kind = "producto",
            originalPrice = 90,
            price = 35,
            quantityTotal = 6,
            pickupHours = 2.5,
            estWeightKg = 0.80,
            tags = "casero, completo",
            allergens = ""
        ),
        QuickOfferTemplate(
            id = "bakery_pack",
            label = "Lote de pan recien horneado",
            title = "Bolsa de 6 piezas de pan del dia",
            kind = "paquete_sorpresa",
            originalPrice = 110,
            price = 38,
            quantityTotal = 4,
            pickupHours = 4.0,
            estWeightKg = 0.60,
            tags = "panaderia, vegetariano",
            allergens = "gluten, huevo, lacteos"
        ),
        QuickOfferTemplate(
            id = "free_donation",
            label = "Donacion solidaria gratis",
            title = "Porcion solidaria del dia sin costo",
            kind = "producto",
            originalPrice = 65,
            price = 0,
            quantityTotal = 8,
            pickupHours = 2.0,
            estWeightKg = 0.65,
            tags = "gratis, solidario",
            allergens = ""
        )
    )

    private var nextPlaceId = 900
    private var nextOfferId = 900
    private var nextOrderId = 900
    private var nextReviewId = 900

    private val places = mutableListOf(
        PlaceItem(
            id = 1,
            name = "Fonda Dona Lupita",
            type = "fonda",
            description = "Comida corrida casera: sopa, guisado del dia y agua fresca.",
            address = "Av. Principal 118, Local B",
            phone = "55 4123 8910",
            openingHours = "Lun-Sab 8:00-18:00",
            lat = 19.4348,
            lng = -99.1350,
            distanceMeters = 310,
            ratingAvg = 4.9,
            ratingCount = 18,
            isFavorite = true,
            offers = mutableListOf(
                PlaceOffer(
                    id = 1,
                    businessId = 1,
                    title = "Comida corrida del dia",
                    description = "Sopa casera, guisado a elegir, arroz, tortillas y agua fresca.",
                    kind = "producto",
                    originalPrice = 85.0,
                    price = 35.0,
                    quantityTotal = 6,
                    quantityLeft = 6,
                    estWeightKg = 0.75,
                    pickupWindow = "Recoger antes de las 18:30",
                    tags = listOf("casero", "completo")
                ),
                PlaceOffer(
                    id = 2,
                    businessId = 1,
                    title = "Guisado sobrante para llevar",
                    description = "Porcion solidaria del cierre sin costo.",
                    kind = "producto",
                    originalPrice = 60.0,
                    price = 0.0,
                    quantityTotal = 3,
                    quantityLeft = 3,
                    estWeightKg = 0.55,
                    pickupWindow = "Recoger antes de las 18:00",
                    tags = listOf("gratis", "solidario")
                )
            ),
            reviews = mutableListOf(
                PlaceReview(1, 1, "Mariana G.", 5, "Porciones generosas y el guisado recien hecho. Excelente trato al recoger."),
                PlaceReview(2, 1, "Carlos R.", 5, "Rescate dos comidas corridas a mitad de precio, todo super limpio y rapido.")
            )
        ),
        PlaceItem(
            id = 2,
            name = "Panaderia La Espiga",
            type = "panaderia",
            description = "Pan dulce tradicional y bolillo horneado hoy.",
            address = "Calle Hidalgo 42",
            phone = "55 8392 1044",
            openingHours = "Diario 7:00-21:00",
            lat = 19.4294,
            lng = -99.1304,
            distanceMeters = 460,
            ratingAvg = 4.8,
            ratingCount = 24,
            isFavorite = true,
            offers = mutableListOf(
                PlaceOffer(
                    id = 3,
                    businessId = 2,
                    title = "Bolsa sorpresa de pan dulce",
                    description = "Surtido de 6 piezas de pan horneado hoy.",
                    kind = "paquete_sorpresa",
                    originalPrice = 120.0,
                    price = 40.0,
                    quantityTotal = 5,
                    quantityLeft = 5,
                    estWeightKg = 0.60,
                    pickupWindow = "Recoger antes de las 21:00",
                    tags = listOf("vegetariano", "dulce"),
                    allergens = "gluten, huevo, lacteos"
                )
            ),
            reviews = mutableListOf(
                PlaceReview(3, 2, "Sofia M.", 5, "La bolsa sorpresa traia 7 piezas de pan dulce del dia. Vale muchisimo la pena.")
            )
        ),
        PlaceItem(
            id = 3,
            name = "Tacos El Guero",
            type = "puesto",
            description = "Tacos de guisado y arroz al cierre del puesto.",
            address = "Esquina Reforma y Juarez",
            phone = "55 6712 3309",
            openingHours = "Lun-Vie 9:00-17:00",
            lat = 19.4372,
            lng = -99.1292,
            distanceMeters = 660,
            ratingAvg = 4.7,
            ratingCount = 11,
            offers = mutableListOf(
                PlaceOffer(
                    id = 4,
                    businessId = 3,
                    title = "Orden de 4 tacos de guisado",
                    description = "Con arroz y guarnicion del cierre.",
                    kind = "producto",
                    originalPrice = 70.0,
                    price = 25.0,
                    quantityTotal = 3,
                    quantityLeft = 2,
                    estWeightKg = 0.50,
                    pickupWindow = "Recoger antes de las 17:30",
                    tags = listOf("al cierre", "tradicional")
                )
            ),
            reviews = mutableListOf(
                PlaceReview(4, 3, "Diego T.", 5, "Llegue con mi codigo QR y en dos minutos me entregaron mi orden bien servida.")
            )
        ),
        PlaceItem(
            id = 4,
            name = "Comedor Comunitario San Jose",
            type = "comedor",
            description = "Comedor solidario. Platillos completos sin costo al final del servicio.",
            address = "Calle Morelos 205",
            phone = "55 2901 4450",
            openingHours = "Lun-Vie 12:00-17:30",
            lat = 19.4265,
            lng = -99.1374,
            distanceMeters = 810,
            ratingAvg = 5.0,
            ratingCount = 31,
            offers = mutableListOf(
                PlaceOffer(
                    id = 5,
                    businessId = 4,
                    title = "Plato caliente del dia",
                    description = "Racion nutritiva completa sin costo.",
                    kind = "producto",
                    originalPrice = 65.0,
                    price = 0.0,
                    quantityTotal = 12,
                    quantityLeft = 10,
                    estWeightKg = 0.70,
                    pickupWindow = "Recoger antes de las 17:30",
                    tags = listOf("gratis", "comunitario")
                )
            ),
            reviews = mutableListOf(
                PlaceReview(5, 4, "Elena V.", 5, "Gran labor comunitaria, comida caliente y nutritiva sin desperdicio.")
            )
        ),
        PlaceItem(
            id = 5,
            name = "Cafeteria Raiz",
            type = "cafeteria",
            description = "Cafe de especialidad, sandwiches artesanales y reposteria.",
            address = "Calle Allende 77",
            phone = "55 9104 2211",
            openingHours = "Diario 8:00-20:30",
            lat = 19.4406,
            lng = -99.1381,
            distanceMeters = 1030,
            ratingAvg = 4.9,
            ratingCount = 15,
            offers = mutableListOf(
                PlaceOffer(
                    id = 6,
                    businessId = 5,
                    title = "Paquete sorpresa de reposteria",
                    description = "Pan de masa madre y reposteria del dia.",
                    kind = "paquete_sorpresa",
                    originalPrice = 150.0,
                    price = 55.0,
                    quantityTotal = 4,
                    quantityLeft = 3,
                    estWeightKg = 0.65,
                    pickupWindow = "Recoger antes de las 20:30",
                    tags = listOf("dulce", "artesanal"),
                    allergens = "gluten, huevo, nueces"
                )
            ),
            reviews = mutableListOf(
                PlaceReview(6, 5, "Andres L.", 5, "El paquete de reposteria artesanal es increible y evita que tiren pan de masa madre.")
            )
        ),
        PlaceItem(
            id = 6,
            name = "Pizzeria Nonna",
            type = "restaurante",
            description = "Pizza artesanal de masa madre al horno de lena.",
            address = "Av. Insurgentes 310",
            phone = "55 7823 9901",
            openingHours = "Mar-Dom 13:00-23:00",
            lat = 19.4438,
            lng = -99.1260,
            distanceMeters = 1420,
            ratingAvg = 4.8,
            ratingCount = 22,
            offers = mutableListOf(
                PlaceOffer(
                    id = 7,
                    businessId = 6,
                    title = "Caja de 4 rebanadas del cierre",
                    description = "Rebanadas grandes al horno de lena listas para llevar.",
                    kind = "paquete_sorpresa",
                    originalPrice = 160.0,
                    price = 60.0,
                    quantityTotal = 4,
                    quantityLeft = 4,
                    estWeightKg = 0.85,
                    pickupWindow = "Recoger antes de las 22:45",
                    tags = listOf("horno de lena", "vegetariano"),
                    allergens = "gluten, lacteos"
                )
            ),
            reviews = mutableListOf(
                PlaceReview(7, 6, "Roberto H.", 5, "Cuatro rebanadas grandes al horno de lena por 60 pesos al cierre. Super recomendado.")
            )
        )
    )

    private val orders = mutableListOf<OrderItem>()
    private var serverImpact: ImpactSummary? = null

    /**
     * Sincroniza lugares, ofertas, favoritos, reservas QR, impacto ambiental y preferencias
     * con el servidor central https://papoys.me/api/places.
     */
    suspend fun syncWithServer(
        userEmail: String,
        lat: Double = currentLat,
        lng: Double = currentLng
    ): Boolean = withContext(Dispatchers.IO) {
        val cleanEmail = userEmail.trim().lowercase()
        if (cleanEmail.isNotEmpty()) {
            currentUserEmail = cleanEmail
        }
        currentLat = lat
        currentLng = lng

        var syncedAny = false

        // 1. Cargar lugares cercanos (incluyendo establecimientos sin ofertas activas para el panel de negocio)
        try {
            val encodedEmail = URLEncoder.encode(currentUserEmail, "UTF-8")
            val nearbyUrl = "$BASE_URL/nearby?lat=$lat&lng=$lng&radius=25000&filter=all&withoutOffers=1&email=$encodedEmail"
            val json = getRequestJson(nearbyUrl)
            if (json != null && json.has("places")) {
                val arr = json.getJSONArray("places")
                val parsedPlaces = mutableListOf<PlaceItem>()
                for (i in 0 until arr.length()) {
                    parsedPlaces.add(parsePlaceJson(arr.getJSONObject(i)))
                }
                if (parsedPlaces.isNotEmpty()) {
                    synchronized(places) {
                        places.clear()
                        places.addAll(parsedPlaces)
                    }
                    syncedAny = true
                }
            }
        } catch (_: Exception) {
        }

        // 2. Cargar reservas QR e impacto ambiental del usuario
        if (currentUserEmail.isNotEmpty()) {
            try {
                val encodedEmail = URLEncoder.encode(currentUserEmail, "UTF-8")
                val ordersJson = getRequestJson("$BASE_URL/orders?email=$encodedEmail")
                if (ordersJson != null && ordersJson.has("orders")) {
                    val arr = ordersJson.getJSONArray("orders")
                    val parsedOrders = mutableListOf<OrderItem>()
                    for (i in 0 until arr.length()) {
                        parsedOrders.add(parseOrderJson(arr.getJSONObject(i)))
                    }
                    synchronized(orders) {
                        orders.clear()
                        orders.addAll(parsedOrders)
                    }
                    if (ordersJson.has("impact") && !ordersJson.isNull("impact")) {
                        serverImpact = parseImpactJson(ordersJson.getJSONObject("impact"))
                    }
                    syncedAny = true
                }
            } catch (_: Exception) {
            }

            // 3. Cargar preferencias alimentarias del usuario
            try {
                val encodedEmail = URLEncoder.encode(currentUserEmail, "UTF-8")
                val profJson = getRequestJson("$BASE_URL/profile?user_email=$encodedEmail")
                if (profJson != null && profJson.has("profile") && !profJson.isNull("profile")) {
                    val prof = profJson.getJSONObject("profile")
                    if (prof.has("diet_tags")) {
                        val tagsArr = prof.getJSONArray("diet_tags")
                        val tags = mutableListOf<String>()
                        for (i in 0 until tagsArr.length()) {
                            val t = tagsArr.optString(i, "").trim()
                            if (t.isNotEmpty()) tags.add(t)
                        }
                        if (tags.isNotEmpty()) {
                            synchronized(userDietTags) {
                                userDietTags.clear()
                                userDietTags.addAll(tags)
                            }
                        }
                    }
                }
            } catch (_: Exception) {
            }
        }

        syncedAny
    }

    fun getUserDietTags(): List<String> = synchronized(userDietTags) { userDietTags.toList() }

    fun saveUserProfile(userEmail: String, displayName: String, dietTags: List<String>): Boolean {
        val cleanEmail = userEmail.trim().lowercase().ifEmpty { currentUserEmail }
        if (dietTags.isNotEmpty()) {
            synchronized(userDietTags) {
                userDietTags.clear()
                userDietTags.addAll(dietTags)
            }
        }
        return runBlocking(Dispatchers.IO) {
            try {
                val tagsJson = JSONArray()
                dietTags.forEach { tagsJson.put(it) }
                val payload = JSONObject().apply {
                    put("user_email", cleanEmail)
                    put("display_name", displayName.trim())
                    put("diet_tags", tagsJson)
                }
                val res = postRequestJson("$BASE_URL/profile", payload)
                res?.optBoolean("success", false) == true
            } catch (_: Exception) {
                false
            }
        }
    }

    fun getPlaces(
        searchQuery: String = "",
        offerFilter: String = "all",
        categoryFilter: String = "all"
    ): List<PlaceItem> {
        val q = searchQuery.trim().lowercase()
        val snapshot = synchronized(places) { places.toList() }
        return snapshot.filter { p ->
            val matchesQuery = q.isEmpty() ||
                p.name.lowercase().contains(q) ||
                p.address.lowercase().contains(q) ||
                p.description.lowercase().contains(q)
            val matchesCategory = categoryFilter == "all" || p.type == categoryFilter
            val hasMatchingOffer = p.offers.any { o ->
                o.status == "active" && o.quantityLeft > 0 && when (offerFilter) {
                    "free" -> o.price == 0.0
                    "discount" -> o.price > 0.0
                    "surprise" -> o.kind == "paquete_sorpresa"
                    else -> true
                }
            }
            matchesQuery && matchesCategory && hasMatchingOffer
        }.sortedBy { it.distanceMeters }
    }

    fun getAllPlaces(): List<PlaceItem> = synchronized(places) { places.toList() }

    fun getFavoritePlaces(): List<PlaceItem> = synchronized(places) { places.filter { it.isFavorite } }

    fun toggleFavorite(businessId: Int, userEmail: String = currentUserEmail): Boolean {
        val place = synchronized(places) { places.find { it.id == businessId } } ?: return false
        val cleanEmail = userEmail.trim().lowercase().ifEmpty { currentUserEmail }
        val serverResult = runBlocking(Dispatchers.IO) {
            try {
                val payload = JSONObject().apply {
                    put("user_email", cleanEmail.ifEmpty { "comensal@foodlink.mx" })
                    put("business_id", businessId)
                }
                postRequestJson("$BASE_URL/favorites/toggle", payload)
            } catch (_: Exception) {
                null
            }
        }
        place.isFavorite = if (serverResult != null && serverResult.has("is_favorite")) {
            serverResult.optBoolean("is_favorite", !place.isFavorite)
        } else {
            !place.isFavorite
        }
        return place.isFavorite
    }

    fun reserveOffer(
        offerId: Int,
        quantity: Int,
        userEmail: String,
        userName: String
    ): Result<OrderItem> {
        val cleanEmail = userEmail.trim().lowercase().ifEmpty { currentUserEmail }
        currentUserEmail = cleanEmail
        val qty = quantity.coerceIn(1, 10)

        // Intentar crear la reserva en el servidor MySQL primero
        val serverResponse = runBlocking(Dispatchers.IO) {
            try {
                val payload = JSONObject().apply {
                    put("offer_id", offerId)
                    put("quantity", qty)
                    put("user_email", cleanEmail)
                    put("user_name", userName.trim().ifEmpty { "Comensal Foodlink" })
                }
                postRequestJson("$BASE_URL/orders", payload)
            } catch (_: Exception) {
                null
            }
        }

        if (serverResponse != null) {
            if (serverResponse.optBoolean("success", false) && serverResponse.has("order")) {
                val order = parseOrderJson(serverResponse.getJSONObject("order"))
                synchronized(orders) {
                    orders.removeAll { it.id == order.id }
                    orders.add(0, order)
                }
                synchronized(places) {
                    for (p in places) {
                        val off = p.offers.find { it.id == offerId }
                        if (off != null) {
                            off.quantityLeft = max(0, off.quantityLeft - qty)
                            if (off.quantityLeft <= 0) off.status = "sold_out"
                            break
                        }
                    }
                }
                return Result.success(order)
            } else if (serverResponse.has("error")) {
                return Result.failure(Exception(serverResponse.optString("error", "No se pudo reservar")))
            }
        }

        // Respaldo local si no hay conexion temporal
        var foundPlace: PlaceItem? = null
        var foundOffer: PlaceOffer? = null
        synchronized(places) {
            for (p in places) {
                val off = p.offers.find { it.id == offerId }
                if (off != null) {
                    foundPlace = p
                    foundOffer = off
                    break
                }
            }
        }
        val place = foundPlace ?: return Result.failure(Exception("Lugar no encontrado"))
        val offer = foundOffer ?: return Result.failure(Exception("Oferta no encontrada"))

        if (offer.status != "active" || offer.quantityLeft < qty) {
            return Result.failure(Exception("Solo quedan ${offer.quantityLeft} unidades disponibles"))
        }

        offer.quantityLeft -= qty
        if (offer.quantityLeft <= 0) {
            offer.status = "sold_out"
        }

        val code = generatePickupCode()
        val order = OrderItem(
            id = nextOrderId++,
            userEmail = cleanEmail,
            userName = userName,
            businessId = place.id,
            businessName = place.name,
            businessAddress = place.address,
            offerId = offer.id,
            offerTitle = offer.title,
            quantity = qty,
            unitPrice = offer.price,
            originalUnitPrice = offer.originalPrice,
            totalPrice = offer.price * qty,
            estWeightKg = ((offer.estWeightKg * qty) * 100.0).roundToInt() / 100.0,
            pickupCode = code,
            pickupWindow = offer.pickupWindow,
            status = "reserved"
        )
        synchronized(orders) {
            orders.add(0, order)
        }
        return Result.success(order)
    }

    fun getOrders(): List<OrderItem> = synchronized(orders) { orders.toList() }

    fun cancelOrder(orderId: Int): Boolean {
        val serverRes = runBlocking(Dispatchers.IO) {
            try {
                postRequestJson("$BASE_URL/orders/$orderId/cancel", JSONObject())
            } catch (_: Exception) {
                null
            }
        }
        val ord = synchronized(orders) { orders.find { it.id == orderId } }
        if (ord != null) {
            ord.status = "cancelled"
            synchronized(places) {
                for (p in places) {
                    val off = p.offers.find { it.id == ord.offerId }
                    if (off != null) {
                        off.quantityLeft += ord.quantity
                        off.status = "active"
                        break
                    }
                }
            }
            return true
        }
        return serverRes?.optBoolean("success", false) == true
    }

    fun redeemOrderByCode(rawCode: String): Result<OrderItem> {
        var code = rawCode.trim().uppercase()
        if (code.startsWith("FOODLINK:")) {
            code = code.removePrefix("FOODLINK:").trim()
        }
        if (!code.startsWith("FL-") && code.length == 6) {
            code = "FL-$code"
        }

        // Validar contra el servidor MySQL (permite canjear en la app codigos QR creados en la web y viceversa)
        val serverRes = runBlocking(Dispatchers.IO) {
            try {
                val payload = JSONObject().apply {
                    put("pickup_code", code)
                }
                postRequestJson("$BASE_URL/business/redeem", payload)
            } catch (_: Exception) {
                null
            }
        }

        if (serverRes != null) {
            if (serverRes.optBoolean("success", false) && serverRes.has("order")) {
                val redeemedOrder = parseOrderJson(serverRes.getJSONObject("order"))
                synchronized(orders) {
                    val idx = orders.indexOfFirst { it.id == redeemedOrder.id || it.pickupCode.equals(code, ignoreCase = true) }
                    if (idx >= 0) {
                        orders[idx] = redeemedOrder
                    } else {
                        orders.add(0, redeemedOrder)
                    }
                }
                return Result.success(redeemedOrder)
            } else if (serverRes.has("error")) {
                return Result.failure(Exception(serverRes.optString("error", "Codigo no valido")))
            }
        }

        val ord = synchronized(orders) { orders.find { it.pickupCode.uppercase() == code } }
            ?: return Result.failure(Exception("No existe ninguna reserva con el codigo $code"))

        if (ord.status == "picked_up") {
            return Result.failure(Exception("El codigo $code ya fue canjeado anteriormente"))
        }
        if (ord.status == "cancelled") {
            return Result.failure(Exception("La reserva $code fue cancelada"))
        }
        ord.status = "picked_up"
        return Result.success(ord)
    }

    fun addReview(businessId: Int, userName: String, stars: Int, comment: String): PlaceReview? {
        val cleanComment = comment.trim().ifBlank { "Excelente comida y atencion." }
        val cleanName = userName.ifBlank { "Comensal Foodlink" }
        val safeStars = stars.coerceIn(1, 5)

        val serverRes = runBlocking(Dispatchers.IO) {
            try {
                val payload = JSONObject().apply {
                    put("user_email", currentUserEmail.ifEmpty { "comensal@foodlink.mx" })
                    put("user_name", cleanName)
                    put("business_id", businessId)
                    put("stars", safeStars)
                    put("comment", cleanComment)
                }
                postRequestJson("$BASE_URL/reviews", payload)
            } catch (_: Exception) {
                null
            }
        }

        val place = synchronized(places) { places.find { it.id == businessId } } ?: return null
        if (serverRes != null && serverRes.optBoolean("success", false)) {
            place.ratingAvg = serverRes.optDouble("rating_avg", place.ratingAvg)
            place.ratingCount = serverRes.optInt("rating_count", place.ratingCount)
            if (serverRes.has("reviews")) {
                val arr = serverRes.getJSONArray("reviews")
                place.reviews.clear()
                for (i in 0 until arr.length()) {
                    place.reviews.add(parseReviewJson(arr.getJSONObject(i), businessId))
                }
                return place.reviews.firstOrNull()
            }
        }

        val rev = PlaceReview(
            id = nextReviewId++,
            businessId = businessId,
            userName = cleanName,
            stars = safeStars,
            comment = cleanComment
        )
        place.reviews.add(0, rev)
        val total = place.ratingAvg * place.ratingCount + rev.stars
        place.ratingCount += 1
        place.ratingAvg = ((total / place.ratingCount) * 10.0).roundToInt() / 10.0
        return rev
    }

    fun registerNewBusiness(
        name: String,
        type: String,
        address: String,
        phone: String,
        openingHours: String,
        description: String
    ): PlaceItem {
        val serverRes = runBlocking(Dispatchers.IO) {
            try {
                val payload = JSONObject().apply {
                    put("owner_email", currentUserEmail.ifEmpty { "aliado@foodlink.mx" })
                    put("name", name.trim())
                    put("type", type)
                    put("description", description.trim().ifBlank { "Comercio local aliado de rescate en Foodlink." })
                    put("address", address.trim().ifBlank { "Centro de la ciudad" })
                    put("phone", phone.trim().ifBlank { "55 0000 0000" })
                    put("opening_hours", openingHours.trim().ifBlank { "Lun-Sab 9:00-21:00" })
                    put("lat", currentLat)
                    put("lng", currentLng)
                }
                postRequestJson("$BASE_URL/business", payload)
            } catch (_: Exception) {
                null
            }
        }

        if (serverRes != null && serverRes.optBoolean("success", false) && serverRes.has("business")) {
            val b = serverRes.getJSONObject("business")
            val created = PlaceItem(
                id = b.optInt("id", nextPlaceId++),
                name = b.optString("name", name.trim()),
                type = b.optString("type", type),
                description = b.optString("description", description.trim()),
                address = b.optString("address", address.trim()),
                phone = b.optString("phone", phone.trim()),
                openingHours = b.optString("opening_hours", openingHours.trim()),
                lat = b.optDouble("lat", currentLat),
                lng = b.optDouble("lng", currentLng),
                distanceMeters = 50,
                ratingAvg = b.optDouble("rating_avg", 5.0),
                ratingCount = b.optInt("rating_count", 1),
                isVerified = true,
                isFavorite = true
            )
            synchronized(places) {
                places.removeAll { it.id == created.id }
                places.add(0, created)
            }
            return created
        }

        val newPlace = PlaceItem(
            id = nextPlaceId++,
            name = name.trim(),
            type = type,
            description = description.trim().ifBlank { "Comercio local aliado de rescate en Foodlink." },
            address = address.trim().ifBlank { "Centro de la ciudad" },
            phone = phone.trim().ifBlank { "55 0000 0000" },
            openingHours = openingHours.trim().ifBlank { "Lun-Sab 9:00-21:00" },
            lat = currentLat,
            lng = currentLng,
            distanceMeters = 150,
            ratingAvg = 5.0,
            ratingCount = 1,
            isVerified = true,
            isFavorite = true
        )
        synchronized(places) {
            places.add(0, newPlace)
        }
        return newPlace
    }

    fun publishOffer(
        businessId: Int,
        title: String,
        kind: String,
        originalPrice: Double,
        price: Double,
        quantityTotal: Int,
        pickupHours: Double,
        estWeightKg: Double,
        tags: String,
        allergens: String
    ): PlaceOffer? {
        val place = synchronized(places) { places.find { it.id == businessId } } ?: return null

        val serverRes = runBlocking(Dispatchers.IO) {
            try {
                val payload = JSONObject().apply {
                    put("owner_email", currentUserEmail.ifEmpty { "aliado@foodlink.mx" })
                    put("business_id", businessId)
                    put("title", title.trim())
                    put("description", "Publicada desde el panel de negocio en Foodlink.")
                    put("kind", kind)
                    put("original_price", max(0.0, originalPrice))
                    put("price", max(0.0, price))
                    put("quantity_total", quantityTotal.coerceIn(1, 100))
                    put("pickup_hours", pickupHours)
                    put("est_weight_kg", estWeightKg.coerceIn(0.1, 20.0))
                    put("tags", tags)
                    put("allergens", allergens.trim())
                }
                postRequestJson("$BASE_URL/business/offers", payload)
            } catch (_: Exception) {
                null
            }
        }

        if (serverRes != null && serverRes.optBoolean("success", false) && serverRes.has("offer")) {
            val parsed = parseOfferJson(serverRes.getJSONObject("offer"), businessId)
            place.offers.add(0, parsed)
            return parsed
        }

        val offer = PlaceOffer(
            id = nextOfferId++,
            businessId = businessId,
            title = title.trim(),
            description = "Publicada desde el panel de negocio en Foodlink.",
            kind = kind,
            originalPrice = max(0.0, originalPrice),
            price = max(0.0, price),
            quantityTotal = quantityTotal.coerceIn(1, 100),
            quantityLeft = quantityTotal.coerceIn(1, 100),
            estWeightKg = estWeightKg.coerceIn(0.1, 20.0),
            pickupWindow = "Durante las proximas ${pickupHours.roundToInt()} h",
            tags = tags.split(",").map { it.trim() }.filter { it.isNotEmpty() },
            allergens = allergens.trim(),
            status = "active"
        )
        place.offers.add(0, offer)
        return offer
    }

    fun closeOffer(offerId: Int) {
        runBlocking(Dispatchers.IO) {
            try {
                postRequestJson("$BASE_URL/business/offers/$offerId/close", JSONObject())
            } catch (_: Exception) {
            }
        }
        synchronized(places) {
            for (p in places) {
                val off = p.offers.find { it.id == offerId }
                if (off != null) {
                    off.status = "cancelled"
                    off.quantityLeft = 0
                    break
                }
            }
        }
    }

    fun computeImpact(): ImpactSummary {
        val snapshotOrders = synchronized(orders) { orders.toList() }
        val valid = snapshotOrders.filter { it.status == "reserved" || it.status == "picked_up" }
        val completed = snapshotOrders.filter { it.status == "picked_up" }
        var rescuesCount = 0
        var kgSaved = 0.0
        var moneySaved = 0.0

        for (o in valid) {
            rescuesCount += o.quantity
            kgSaved += o.estWeightKg
            val diff = max(0.0, o.originalUnitPrice - o.unitPrice) * o.quantity
            val fallback = if (o.unitPrice == 0.0) 55.0 * o.quantity else 0.0
            moneySaved += max(diff, fallback)
        }

        val kgRounded = (kgSaved * 100.0).roundToInt() / 100.0
        val co2Rounded = (kgSaved * 2.5 * 100.0).roundToInt() / 100.0
        val waterLiters = (kgSaved * 680.0).roundToInt()
        val moneyRounded = moneySaved.roundToInt()

        val levels = listOf(
            Triple(0, "Semilla Solidaria", 2),
            Triple(2, "Guardian del Barrio", 5),
            Triple(5, "Heroe Cero Desperdicio", 12),
            Triple(12, "Emblema Gastronomico", 25),
            Triple(25, "Leyenda Cero Desperdicio", 50)
        )
        var currentTitle = levels.first().second
        var nextTitle = levels[1].second
        var nextTarget = levels.first().third
        var prevMin = 0

        for (i in levels.indices) {
            if (rescuesCount >= levels[i].first) {
                currentTitle = levels[i].second
                prevMin = levels[i].first
                nextTarget = levels[i].third
                nextTitle = if (i + 1 < levels.size) levels[i + 1].second else levels[i].second
            }
        }
        val span = max(1, nextTarget - prevMin)
        val progress = min(100, max(6, (((rescuesCount - prevMin).toDouble() / span) * 100.0).roundToInt()))

        val badges = listOf(
            ImpactBadge(
                id = "first_rescue",
                title = "Primer Rescate",
                description = "Apartaste tu primera comida en Foodlink",
                unlocked = rescuesCount >= 1
            ),
            ImpactBadge(
                id = "surprise_fan",
                title = "Explorador Sorpresa",
                description = "Rescataste un paquete sorpresa al cierre",
                unlocked = valid.isNotEmpty()
            ),
            ImpactBadge(
                id = "zero_waste",
                title = "Impacto 2 kg",
                description = "Evitaste el desperdicio de al menos 2 kg de alimentos",
                unlocked = kgRounded >= 2.0
            ),
            ImpactBadge(
                id = "community_hero",
                title = "Heroe del Barrio",
                description = "5 o mas porciones rescatadas en comercios locales",
                unlocked = rescuesCount >= 5
            )
        )

        return ImpactSummary(
            rescuesCount = rescuesCount,
            completedCount = completed.size,
            kgSaved = kgRounded,
            co2AvoidedKg = co2Rounded,
            waterLiters = waterLiters,
            moneySavedMxn = moneyRounded,
            levelTitle = currentTitle,
            nextLevelTitle = nextTitle,
            nextLevelTarget = nextTarget,
            levelProgressPercent = progress,
            badges = badges
        )
    }

    private fun parsePlaceJson(obj: JSONObject): PlaceItem {
        val placeId = obj.optInt("id", 0)
        val offersList = mutableListOf<PlaceOffer>()
        if (obj.has("offers") && !obj.isNull("offers")) {
            val arr = obj.getJSONArray("offers")
            for (i in 0 until arr.length()) {
                offersList.add(parseOfferJson(arr.getJSONObject(i), placeId))
            }
        }
        val reviewsList = mutableListOf<PlaceReview>()
        if (obj.has("reviews") && !obj.isNull("reviews")) {
            val arr = obj.getJSONArray("reviews")
            for (i in 0 until arr.length()) {
                reviewsList.add(parseReviewJson(arr.getJSONObject(i), placeId))
            }
        }
        return PlaceItem(
            id = placeId,
            name = obj.optString("name", "Establecimiento"),
            type = obj.optString("type", "fonda"),
            description = obj.optString("description", ""),
            address = obj.optString("address", ""),
            phone = obj.optString("phone", ""),
            openingHours = obj.optString("opening_hours", "Hoy 9:00-20:00"),
            lat = obj.optDouble("lat", 19.4326),
            lng = obj.optDouble("lng", -99.1332),
            distanceMeters = obj.optInt("distance_m", 250),
            ratingAvg = obj.optDouble("rating_avg", 4.9),
            ratingCount = obj.optInt("rating_count", 1),
            isVerified = obj.optBoolean("is_verified", true),
            isFavorite = obj.optBoolean("is_favorite", false),
            offers = offersList,
            reviews = reviewsList
        )
    }

    private fun parseOfferJson(obj: JSONObject, defaultBusinessId: Int): PlaceOffer {
        val tagsList = mutableListOf<String>()
        if (obj.has("tags") && !obj.isNull("tags")) {
            val tArr = obj.optJSONArray("tags")
            if (tArr != null) {
                for (i in 0 until tArr.length()) {
                    val t = tArr.optString(i, "").trim()
                    if (t.isNotEmpty()) tagsList.add(t)
                }
            }
        }
        val pickupEnd = obj.optString("pickup_end", "")
        val windowLabel = formatPickupWindow(pickupEnd)
        return PlaceOffer(
            id = obj.optInt("id", 0),
            businessId = obj.optInt("business_id", defaultBusinessId),
            title = obj.optString("title", "Oferta de rescate"),
            description = obj.optString("description", ""),
            kind = obj.optString("kind", "producto"),
            originalPrice = obj.optDouble("original_price", 0.0),
            price = obj.optDouble("price", 0.0),
            quantityTotal = obj.optInt("quantity_total", 1),
            quantityLeft = obj.optInt("quantity_left", 1),
            estWeightKg = obj.optDouble("est_weight_kg", 0.65),
            pickupWindow = windowLabel,
            tags = tagsList,
            allergens = obj.optString("allergens", ""),
            status = obj.optString("status", "active")
        )
    }

    private fun parseReviewJson(obj: JSONObject, defaultBusinessId: Int): PlaceReview {
        return PlaceReview(
            id = obj.optInt("id", nextReviewId++),
            businessId = obj.optInt("business_id", defaultBusinessId),
            userName = obj.optString("user_name", "Comensal Foodlink"),
            stars = obj.optInt("stars", 5),
            comment = obj.optString("comment", "")
        )
    }

    private fun parseOrderJson(obj: JSONObject): OrderItem {
        val pickupEnd = obj.optString("pickup_end", "")
        return OrderItem(
            id = obj.optInt("id", 0),
            userEmail = obj.optString("user_email", currentUserEmail),
            userName = obj.optString("user_name", "Comensal"),
            businessId = obj.optInt("business_id", 1),
            businessName = obj.optString("business_name", "Establecimiento"),
            businessAddress = obj.optString("business_address", ""),
            offerId = obj.optInt("offer_id", 0),
            offerTitle = obj.optString("offer_title", "Oferta de rescate"),
            quantity = obj.optInt("quantity", 1),
            unitPrice = obj.optDouble("unit_price", 0.0),
            originalUnitPrice = obj.optDouble("original_unit_price", 0.0),
            totalPrice = obj.optDouble("total_price", 0.0),
            estWeightKg = obj.optDouble("est_weight_kg", 0.65),
            pickupCode = obj.optString("pickup_code", "FL-000000"),
            pickupWindow = formatPickupWindow(pickupEnd),
            status = obj.optString("status", "reserved")
        )
    }

    private fun parseImpactJson(obj: JSONObject): ImpactSummary {
        val badgesList = mutableListOf<ImpactBadge>()
        if (obj.has("badges") && !obj.isNull("badges")) {
            val arr = obj.getJSONArray("badges")
            for (i in 0 until arr.length()) {
                val b = arr.getJSONObject(i)
                badgesList.add(
                    ImpactBadge(
                        id = b.optString("id", ""),
                        title = b.optString("title", ""),
                        description = b.optString("description", ""),
                        unlocked = b.optBoolean("unlocked", false)
                    )
                )
            }
        }
        return ImpactSummary(
            rescuesCount = obj.optInt("rescues_count", 0),
            completedCount = obj.optInt("completed_count", 0),
            kgSaved = obj.optDouble("kg_saved", 0.0),
            co2AvoidedKg = obj.optDouble("co2_avoided_kg", 0.0),
            waterLiters = obj.optInt("water_liters", 0),
            moneySavedMxn = obj.optInt("money_saved_mxn", 0),
            levelTitle = obj.optString("level_title", "Semilla Solidaria"),
            nextLevelTitle = obj.optString("next_level_title", "Guardian del Barrio"),
            nextLevelTarget = obj.optInt("next_level_target", 2),
            levelProgressPercent = obj.optInt("level_progress_percent", 6),
            badges = badgesList
        )
    }

    private fun formatPickupWindow(isoString: String): String {
        if (isoString.isBlank()) return "Hoy antes del cierre"
        return try {
            val clean = isoString.replace("Z", "+0000")
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ", Locale.US)
            val date = parser.parse(clean) ?: return "Hoy antes del cierre"
            val fmt = SimpleDateFormat("HH:mm", Locale.getDefault())
            fmt.timeZone = TimeZone.getDefault()
            "Recoger antes de las ${fmt.format(date)}"
        } catch (_: Exception) {
            "Hoy antes del cierre"
        }
    }

    private fun getRequestJson(urlString: String): JSONObject? {
        var connection: HttpURLConnection? = null
        return try {
            val url = URL(urlString)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                setRequestProperty("Accept", "application/json")
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else (connection.errorStream ?: connection.inputStream)
            val text = BufferedReader(InputStreamReader(stream, "UTF-8")).use { it.readText() }
            JSONObject(text)
        } catch (_: Exception) {
            null
        } finally {
            connection?.disconnect()
        }
    }

    private fun postRequestJson(urlString: String, body: JSONObject): JSONObject? {
        var connection: HttpURLConnection? = null
        return try {
            val url = URL(urlString)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                doOutput = true
                doInput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Accept", "application/json")
            }
            OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
                writer.write(body.toString())
                writer.flush()
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else (connection.errorStream ?: connection.inputStream)
            val text = BufferedReader(InputStreamReader(stream, "UTF-8")).use { it.readText() }
            JSONObject(text)
        } catch (_: Exception) {
            null
        } finally {
            connection?.disconnect()
        }
    }

    private fun generatePickupCode(): String {
        val alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        val sb = StringBuilder("FL-")
        repeat(6) {
            sb.append(alphabet[Random.nextInt(alphabet.length)])
        }
        return sb.toString()
    }
}

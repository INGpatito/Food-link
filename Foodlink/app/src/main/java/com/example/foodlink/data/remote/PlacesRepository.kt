package com.example.foodlink.data.remote

import com.example.foodlink.data.model.ImpactBadge
import com.example.foodlink.data.model.ImpactSummary
import com.example.foodlink.data.model.OrderItem
import com.example.foodlink.data.model.PlaceItem
import com.example.foodlink.data.model.PlaceOffer
import com.example.foodlink.data.model.PlaceReview
import com.example.foodlink.data.model.QuickOfferTemplate
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.random.Random

/**
 * Repositorio de lugares, ofertas de rescate, reservas con QR, favoritos,
 * resenas, impacto ambiental y panel de negocio para la app Android de Foodlink.
 */
object PlacesRepository {

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

    private var nextPlaceId = 9
    private var nextOfferId = 20
    private var nextOrderId = 101
    private var nextReviewId = 50

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

    fun getPlaces(
        searchQuery: String = "",
        offerFilter: String = "all", // "all" | "free" | "discount" | "surprise"
        categoryFilter: String = "all"
    ): List<PlaceItem> {
        val q = searchQuery.trim().lowercase()
        return places.filter { p ->
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

    fun getAllPlaces(): List<PlaceItem> = places.toList()

    fun getFavoritePlaces(): List<PlaceItem> = places.filter { it.isFavorite }

    fun toggleFavorite(businessId: Int): Boolean {
        val place = places.find { it.id == businessId } ?: return false
        place.isFavorite = !place.isFavorite
        return place.isFavorite
    }

    fun reserveOffer(
        offerId: Int,
        quantity: Int,
        userEmail: String,
        userName: String
    ): Result<OrderItem> {
        var foundPlace: PlaceItem? = null
        var foundOffer: PlaceOffer? = null
        for (p in places) {
            val off = p.offers.find { it.id == offerId }
            if (off != null) {
                foundPlace = p
                foundOffer = off
                break
            }
        }
        val place = foundPlace ?: return Result.failure(Exception("Lugar no encontrado"))
        val offer = foundOffer ?: return Result.failure(Exception("Oferta no encontrada"))

        val qty = quantity.coerceIn(1, 10)
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
            userEmail = userEmail,
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
        orders.add(0, order)
        return Result.success(order)
    }

    fun getOrders(): List<OrderItem> = orders.toList()

    fun cancelOrder(orderId: Int): Boolean {
        val ord = orders.find { it.id == orderId } ?: return false
        if (ord.status != "reserved") return false
        ord.status = "cancelled"
        for (p in places) {
            val off = p.offers.find { it.id == ord.offerId }
            if (off != null) {
                off.quantityLeft += ord.quantity
                off.status = "active"
                break
            }
        }
        return true
    }

    fun redeemOrderByCode(rawCode: String): Result<OrderItem> {
        var code = rawCode.trim().uppercase()
        if (code.startsWith("FOODLINK:")) {
            code = code.removePrefix("FOODLINK:").trim()
        }
        if (!code.startsWith("FL-") && code.length == 6) {
            code = "FL-$code"
        }
        val ord = orders.find { it.pickupCode.uppercase() == code }
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
        val place = places.find { it.id == businessId } ?: return null
        val rev = PlaceReview(
            id = nextReviewId++,
            businessId = businessId,
            userName = userName.ifBlank { "Comensal Foodlink" },
            stars = stars.coerceIn(1, 5),
            comment = comment.trim().ifBlank { "Excelente comida y atencion." }
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
        val newPlace = PlaceItem(
            id = nextPlaceId++,
            name = name.trim(),
            type = type,
            description = description.trim().ifBlank { "Comercio local aliado de rescate en Foodlink." },
            address = address.trim().ifBlank { "Centro de la ciudad" },
            phone = phone.trim().ifBlank { "55 0000 0000" },
            openingHours = openingHours.trim().ifBlank { "Lun-Sab 9:00-21:00" },
            lat = 19.4326,
            lng = -99.1332,
            distanceMeters = 150,
            ratingAvg = 5.0,
            ratingCount = 1,
            isVerified = true,
            isFavorite = true
        )
        places.add(0, newPlace)
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
        val place = places.find { it.id == businessId } ?: return null
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
        for (p in places) {
            val off = p.offers.find { it.id == offerId }
            if (off != null) {
                off.status = "cancelled"
                off.quantityLeft = 0
                break
            }
        }
    }

    fun computeImpact(): ImpactSummary {
        val valid = orders.filter { it.status == "reserved" || it.status == "picked_up" }
        val completed = orders.filter { it.status == "picked_up" }
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

    private fun generatePickupCode(): String {
        val alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        val sb = StringBuilder("FL-")
        repeat(6) {
            sb.append(alphabet[Random.nextInt(alphabet.length)])
        }
        return sb.toString()
    }
}

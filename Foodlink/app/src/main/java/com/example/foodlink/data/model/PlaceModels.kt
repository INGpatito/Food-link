package com.example.foodlink.data.model

data class PlaceOffer(
    val id: Int,
    val businessId: Int,
    val title: String,
    val description: String = "",
    val kind: String = "producto", // "producto" | "paquete_sorpresa"
    val originalPrice: Double,
    val price: Double,
    val quantityTotal: Int,
    var quantityLeft: Int,
    val estWeightKg: Double = 0.65,
    val pickupWindow: String = "Hoy antes de las 20:30",
    val tags: List<String> = emptyList(),
    val allergens: String = "",
    var status: String = "active"
) {
    val discountPercent: Int
        get() = if (originalPrice > 0 && price < originalPrice) {
            Math.round(((originalPrice - price) / originalPrice) * 100.0).toInt()
        } else 0
}

data class PlaceReview(
    val id: Int,
    val businessId: Int,
    val userName: String,
    val stars: Int,
    val comment: String
)

data class PlaceItem(
    val id: Int,
    val name: String,
    val type: String, // fonda, panaderia, puesto, restaurante, cafeteria, comedor
    val description: String,
    val address: String,
    val phone: String,
    val openingHours: String,
    val lat: Double,
    val lng: Double,
    val distanceMeters: Int,
    var ratingAvg: Double,
    var ratingCount: Int,
    val isVerified: Boolean = true,
    var isFavorite: Boolean = false,
    val offers: MutableList<PlaceOffer> = mutableListOf(),
    val reviews: MutableList<PlaceReview> = mutableListOf()
) {
    val typeLabel: String
        get() = when (type) {
            "fonda" -> "Fonda"
            "panaderia" -> "Panaderia"
            "puesto" -> "Puesto"
            "restaurante" -> "Restaurante"
            "cafeteria" -> "Cafeteria"
            "comedor" -> "Comedor comunitario"
            "mercado" -> "Mercado"
            else -> "Comercio"
        }
}

data class OrderItem(
    val id: Int,
    val userEmail: String,
    val userName: String,
    val businessId: Int,
    val businessName: String,
    val businessAddress: String,
    val offerId: Int,
    val offerTitle: String,
    val quantity: Int,
    val unitPrice: Double,
    val originalUnitPrice: Double,
    val totalPrice: Double,
    val estWeightKg: Double,
    val pickupCode: String,
    val pickupWindow: String,
    var status: String = "reserved" // "reserved" | "picked_up" | "cancelled"
)

data class ImpactBadge(
    val id: String,
    val title: String,
    val description: String,
    val unlocked: Boolean
)

data class ImpactSummary(
    val rescuesCount: Int,
    val completedCount: Int,
    val kgSaved: Double,
    val co2AvoidedKg: Double,
    val waterLiters: Int,
    val moneySavedMxn: Int,
    val levelTitle: String,
    val nextLevelTitle: String,
    val nextLevelTarget: Int,
    val levelProgressPercent: Int,
    val badges: List<ImpactBadge>
)

data class QuickOfferTemplate(
    val id: String,
    val label: String,
    val title: String,
    val kind: String,
    val originalPrice: Int,
    val price: Int,
    val quantityTotal: Int,
    val pickupHours: Double,
    val estWeightKg: Double,
    val tags: String,
    val allergens: String
)

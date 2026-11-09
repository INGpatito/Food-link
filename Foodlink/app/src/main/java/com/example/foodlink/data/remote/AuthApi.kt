package com.example.foodlink.data.remote

import com.example.foodlink.data.model.AuthResponse
import com.example.foodlink.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

object AuthApi {
    // URL publica del servidor en Orange Pi a traves de Cloudflare Tunnel
    // Accesible desde cualquier red Wi-Fi o datos moviles en cualquier lugar del mundo
    private const val BASE_URL = "https://papoys.me/api/auth"
    private const val TIMEOUT_MS = 15000

    // Credenciales de EmailJS sincronizadas con el servidor web para respaldo directo
    private const val EMAILJS_API_URL = "https://api.emailjs.com/api/v1.0/email/send"
    private const val EMAILJS_SERVICE_ID = "service_hsjvuns"
    private const val EMAILJS_TEMPLATE_ID = "template_pu7i0mf"
    private const val EMAILJS_PUBLIC_KEY = "RgCYeiuLtXTQ4fF_9"

    suspend fun login(email: String, password: String): AuthResponse = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("email", email.trim().lowercase())
            put("password", password)
        }
        postRequest("$BASE_URL/login", payload)
    }

    suspend fun register(name: String, email: String, password: String): AuthResponse = withContext(Dispatchers.IO) {
        val cleanName = name.trim()
        val cleanEmail = email.trim().lowercase()
        val payload = JSONObject().apply {
            put("name", cleanName)
            put("email", cleanEmail)
            put("password", password)
        }
        val response = postRequest("$BASE_URL/register", payload)
        if (response.success && !response.emailSent && !response.verificationCode.isNullOrBlank()) {
            val sent = sendEmailViaEmailJs(cleanEmail, cleanName, response.verificationCode)
            response.copy(emailSent = sent)
        } else {
            response
        }
    }

    suspend fun verify(email: String, code: String): AuthResponse = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("email", email.trim().lowercase())
            put("code", code.trim())
        }
        postRequest("$BASE_URL/verify", payload)
    }

    suspend fun resendCode(email: String, userName: String = "Usuario"): AuthResponse = withContext(Dispatchers.IO) {
        val cleanEmail = email.trim().lowercase()
        val payload = JSONObject().apply {
            put("email", cleanEmail)
        }
        val response = postRequest("$BASE_URL/resend-code", payload)
        if (response.success && !response.emailSent && !response.verificationCode.isNullOrBlank()) {
            val sent = sendEmailViaEmailJs(cleanEmail, userName, response.verificationCode)
            response.copy(emailSent = sent)
        } else {
            response
        }
    }

    suspend fun fetchMe(email: String): AuthResponse = withContext(Dispatchers.IO) {
        var connection: HttpURLConnection? = null
        try {
            val encoded = URLEncoder.encode(email.trim().lowercase(), "UTF-8")
            val url = URL("$BASE_URL/me?email=$encoded")
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                setRequestProperty("Accept", "application/json")
            }
            val statusCode = connection.responseCode
            val inputStream = if (statusCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream ?: connection.inputStream
            }
            val responseText = BufferedReader(InputStreamReader(inputStream, "UTF-8")).use { it.readText() }
            val json = JSONObject(responseText)
            val success = json.optBoolean("success", statusCode in 200..299)
            val message = json.optString("message", "")
            var user: User? = null
            if (json.has("user") && !json.isNull("user")) {
                val userObj = json.getJSONObject("user")
                user = User(
                    id = userObj.optInt("id", 0),
                    name = userObj.optString("name", ""),
                    email = userObj.optString("email", ""),
                    isVerified = userObj.optBoolean("is_verified", false)
                )
            }
            AuthResponse(success = success, message = message, user = user)
        } catch (e: Exception) {
            AuthResponse(success = false, message = "No se pudo sincronizar la sesion con el servidor.")
        } finally {
            connection?.disconnect()
        }
    }

    private fun sendEmailViaEmailJs(toEmail: String, toName: String, verificationCode: String): Boolean {
        var connection: HttpURLConnection? = null
        return try {
            val templateParams = JSONObject().apply {
                put("to_email", toEmail.trim())
                put("to_name", toName.ifBlank { "Usuario" })
                put("verification_code", verificationCode.trim())
            }
            val body = JSONObject().apply {
                put("service_id", EMAILJS_SERVICE_ID)
                put("template_id", EMAILJS_TEMPLATE_ID)
                put("user_id", EMAILJS_PUBLIC_KEY)
                put("template_params", templateParams)
            }
            val url = URL(EMAILJS_API_URL)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                doOutput = true
                doInput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Origin", "https://papoys.me")
                setRequestProperty("Referer", "https://papoys.me/")
                setRequestProperty(
                    "User-Agent",
                    "Mozilla/5.0 (Linux; Android 14; FoodlinkApp) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
                )
            }
            OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
                writer.write(body.toString())
                writer.flush()
            }
            val statusCode = connection.responseCode
            statusCode in 200..299
        } catch (e: Exception) {
            false
        } finally {
            connection?.disconnect()
        }
    }

    private fun postRequest(urlString: String, jsonBody: JSONObject): AuthResponse {
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
                writer.write(jsonBody.toString())
                writer.flush()
            }

            val statusCode = connection.responseCode
            val inputStream = if (statusCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream ?: connection.inputStream
            }

            val responseText = BufferedReader(InputStreamReader(inputStream, "UTF-8")).use { reader ->
                reader.readText()
            }

            val json = JSONObject(responseText)
            val success = json.optBoolean("success", statusCode in 200..299)
            val message = json.optString("message", if (success) "Operacion exitosa" else "Error en la solicitud")

            var user: User? = null
            if (json.has("user") && !json.isNull("user")) {
                val userObj = json.getJSONObject("user")
                user = User(
                    id = userObj.optInt("id", 0),
                    name = userObj.optString("name", ""),
                    email = userObj.optString("email", ""),
                    isVerified = userObj.optBoolean("is_verified", false)
                )
            }

            val verificationCode = if (json.has("verificationCode") && !json.isNull("verificationCode")) {
                json.optString("verificationCode")
            } else null
            val emailSent = json.optBoolean("emailSent", false)

            AuthResponse(
                success = success,
                message = message,
                user = user,
                verificationCode = verificationCode,
                emailSent = emailSent
            )
        } catch (e: Exception) {
            AuthResponse(
                success = false,
                message = "Error de conexion: No se pudo conectar con el servidor. Revisa tu acceso a internet."
            )
        } finally {
            connection?.disconnect()
        }
    }
}

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

object AuthApi {
    // URL publica del servidor en Orange Pi a traves de Cloudflare Tunnel
    // Accesible desde cualquier red Wi-Fi o datos moviles en cualquier lugar del mundo
    private const val BASE_URL = "https://papoys.me/api/auth"
    private const val TIMEOUT_MS = 15000

    suspend fun login(email: String, password: String): AuthResponse = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("email", email.trim().lowercase())
            put("password", password)
        }
        postRequest("$BASE_URL/login", payload)
    }

    suspend fun register(name: String, email: String, password: String): AuthResponse = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("name", name.trim())
            put("email", email.trim().lowercase())
            put("password", password)
        }
        postRequest("$BASE_URL/register", payload)
    }

    suspend fun verify(email: String, code: String): AuthResponse = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("email", email.trim().lowercase())
            put("code", code.trim())
        }
        postRequest("$BASE_URL/verify", payload)
    }

    suspend fun resendCode(email: String): AuthResponse = withContext(Dispatchers.IO) {
        val payload = JSONObject().apply {
            put("email", email.trim().lowercase())
        }
        postRequest("$BASE_URL/resend-code", payload)
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
            if (json.has("user")) {
                val userObj = json.getJSONObject("user")
                user = User(
                    id = userObj.optInt("id", 0),
                    name = userObj.optString("name", ""),
                    email = userObj.optString("email", ""),
                    isVerified = userObj.optBoolean("is_verified", false)
                )
            }

            val verificationCode = if (json.has("verificationCode")) json.optString("verificationCode") else null

            AuthResponse(
                success = success,
                message = message,
                user = user,
                verificationCode = verificationCode
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

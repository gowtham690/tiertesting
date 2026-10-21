package net.mctiers.api;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

public class BackendClient {
    private final String baseUrl;
    private final String apiKey;
    private final HttpClient httpClient;

    public BackendClient(String baseUrl, String apiKey, int timeoutSeconds) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.apiKey = apiKey;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
    }

    public CompletableFuture<String> generateLinkCode(UUID uuid, String playerName) {
        JsonObject payload = new JsonObject();
        payload.addProperty("minecraftUuid", uuid.toString().replace("-", ""));
        payload.addProperty("minecraftName", playerName);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/auth/link/generate"))
                .header("Content-Type", "application/json")
                .header("X-API-Key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> {
                    if (response.statusCode() == 200) {
                        JsonObject obj = JsonParser.parseString(response.body()).getAsJsonObject();
                        return obj.get("code").getAsString();
                    } else {
                        throw new RuntimeException("Backend returned error: " + response.body());
                    }
                });
    }

    public CompletableFuture<JsonObject> submitMatchResult(String testId, String testerDiscordId, int playerScore, int testerScore, String notes) {
        JsonObject payload = new JsonObject();
        payload.addProperty("testId", testId);
        payload.addProperty("testerDiscordId", testerDiscordId);
        payload.addProperty("playerScore", playerScore);
        payload.addProperty("testerScore", testerScore);
        if (notes != null) payload.addProperty("notes", notes);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/tests/submit"))
                .header("Content-Type", "application/json")
                .header("X-API-Key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                .build();

        return httpClient.sendAsync(request, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> {
                    if (response.statusCode() == 200) {
                        return JsonParser.parseString(response.body()).getAsJsonObject();
                    } else {
                        throw new RuntimeException("Result submission failed: " + response.body());
                    }
                });
    }
}

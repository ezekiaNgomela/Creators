package upstream

import "os"

type Service struct {
	Name    string
	Route   string
	BaseURL string
}

func Registry() map[string]Service {
	return map[string]Service{
		"auth":          {Name: "auth", Route: "auth", BaseURL: "http://127.0.0.1:" + getEnv("AUTH_SERVICE_PORT", "18001")},
		"subscriptions": {Name: "subscriptions", Route: "subscriptions", BaseURL: "http://127.0.0.1:" + getEnv("SUBSCRIPTION_SERVICE_PORT", "18003")},
		"posts":         {Name: "posts", Route: "posts", BaseURL: "http://127.0.0.1:" + getEnv("POST_SERVICE_PORT", "18005")},
		"streams":       {Name: "streams", Route: "streams", BaseURL: "http://127.0.0.1:" + getEnv("STREAM_SERVICE_PORT", "18006")},
		"wallet":        {Name: "wallet", Route: "wallet", BaseURL: "http://127.0.0.1:" + getEnv("WALLET_SERVICE_PORT", "18007")},
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

package upstream

import "os"

type Service struct {
	Name    string
	Route   string
	BaseURL string
}

func Registry() map[string]Service {
	return map[string]Service{
		"auth":          {Name: "auth", Route: "auth", BaseURL: getEnv("AUTH_SERVICE_URL", "http://127.0.0.1:"+getEnv("AUTH_SERVICE_PORT", "8001"))},
		"subscriptions": {Name: "subscriptions", Route: "subscriptions", BaseURL: getEnv("SUBSCRIPTION_SERVICE_URL", "http://127.0.0.1:"+getEnv("SUBSCRIPTION_SERVICE_PORT", "8003"))},
		"posts":         {Name: "posts", Route: "posts", BaseURL: getEnv("POST_SERVICE_URL", "http://127.0.0.1:"+getEnv("POST_SERVICE_PORT", "8005"))},
		"streams":       {Name: "streams", Route: "streams", BaseURL: getEnv("STREAM_SERVICE_URL", "http://127.0.0.1:"+getEnv("STREAM_SERVICE_PORT", "8006"))},
		"wallet":        {Name: "wallet", Route: "wallet", BaseURL: getEnv("WALLET_SERVICE_URL", "http://127.0.0.1:"+getEnv("WALLET_SERVICE_PORT", "8007"))},
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

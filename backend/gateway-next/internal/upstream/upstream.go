package upstream

type Service struct {
	Name    string
	BaseURL string
}

func Registry() map[string]Service {
	return map[string]Service{
		"auth":         {Name: "auth", BaseURL: "http://localhost:8001"},
		"user":         {Name: "user", BaseURL: "http://localhost:8002"},
		"subscription": {Name: "subscription", BaseURL: "http://localhost:8003"},
		"chat":         {Name: "chat", BaseURL: "http://localhost:8004"},
		"post":         {Name: "post", BaseURL: "http://localhost:8005"},
		"stream":       {Name: "stream", BaseURL: "http://localhost:8006"},
		"wallet":       {Name: "wallet", BaseURL: "http://localhost:8007"},
		"promotion":    {Name: "promotion", BaseURL: "http://localhost:8008"},
		"notification": {Name: "notification", BaseURL: "http://localhost:8009"},
	}
}

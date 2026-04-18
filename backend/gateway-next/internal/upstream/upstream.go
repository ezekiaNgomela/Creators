package upstream

type Service struct {
	Name    string
	Route   string
	BaseURL string
}

func Registry() map[string]Service {
	return map[string]Service{
		"auth":          {Name: "auth", Route: "auth", BaseURL: "http://localhost:8001"},
		"subscriptions": {Name: "subscriptions", Route: "subscriptions", BaseURL: "http://localhost:8003"},
		"posts":         {Name: "posts", Route: "posts", BaseURL: "http://localhost:8005"},
		"streams":       {Name: "streams", Route: "streams", BaseURL: "http://localhost:8006"},
		"wallet":        {Name: "wallet", Route: "wallet", BaseURL: "http://localhost:8007"},
	}
}

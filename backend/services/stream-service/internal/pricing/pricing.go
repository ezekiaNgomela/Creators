package pricing

func CalculateStreamCost(minutes int) float64 {
	if minutes >= 30 {
		return 10
	}
	return float64(minutes) * 0.1
}

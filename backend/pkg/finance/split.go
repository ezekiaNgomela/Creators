package finance

func Split(amount float64) (creator, platform, reserve float64) {
	creator = amount * 0.80
	platform = amount * 0.10
	reserve = amount * 0.10
	return
}

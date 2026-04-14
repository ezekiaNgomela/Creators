package access

func CanStartStream(role string, verified bool) bool {
	return role == "super_user" && verified
}

func CanJoinPayPerView(balance float64, cost float64) bool {
	return balance >= cost
}

func CanJoinSubscriberStream(hasSubscription bool) bool {
	return hasSubscription
}

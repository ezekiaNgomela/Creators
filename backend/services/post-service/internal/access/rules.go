package access

func CanCreatePost(role string, verified bool) bool {
	return role == "super_user" && verified
}

func CanSellPaidPost(role string, verified bool) bool {
	return role == "super_user" && verified
}

func CanViewPaidPost(hasPurchase bool, hasSubscription bool) bool {
	return hasPurchase || hasSubscription
}

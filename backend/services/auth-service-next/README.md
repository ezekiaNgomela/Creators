# auth-service-next

This service is the upgraded auth implementation added after the initial scaffold.

Implemented here:
- register normal users with email, password, username
- register super users with email, password, username, billing preference, channel name, and display name
- login with email and password
- verify super user email
- JWT issue and me endpoint
- Google OAuth URL generation scaffold

Business rules covered:
- normal user role = `user`
- creator role = `super_user`
- only verified super users should continue to protected creator actions
- creator channels, plans, wallet, posts, streams, and promotions are represented in the migration file

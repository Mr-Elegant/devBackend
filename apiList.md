

==> auth Routes
- POST /signup
- POST /login
- POST /logout

==> profile Routes
- GET /profile/view
- PATCH /profile/edit
- PATCH /profile/updatePassword

==> Connection requests
- POST /request/send/:status/:userId          (status: ("ignored" or "interested"))
- POST /request/review/:accepted/:requestId    (status: ("accepted" or "rejected"))  


==>  user feed Connections Routes
- GET /user/requests/received
- GET /user/connections
- GET /user/feed - Gets you the profiles of other devs

Status: ignore, interested, accepted, rejected
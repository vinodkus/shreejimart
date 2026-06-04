using Microsoft.AspNetCore.Mvc;

namespace ShreeJiMart.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(IConfiguration config) : ControllerBase
{
    public sealed record LoginRequest(string Username, string Password);

    public sealed record LoginResponse(string Token);

    [HttpPost("login")]
    public ActionResult<LoginResponse> Login([FromBody] LoginRequest request)
    {
        var expectedUser = config["ADMIN_USERNAME"] ?? "admin";
        var expectedPassword = config["ADMIN_PASSWORD"] ?? "admin123";
        var token = config["ADMIN_TOKEN"] ?? "shreejimart-dev-admin-token";

        if (request.Username != expectedUser || request.Password != expectedPassword)
            return Unauthorized("Invalid username or password.");

        return Ok(new LoginResponse(token));
    }
}

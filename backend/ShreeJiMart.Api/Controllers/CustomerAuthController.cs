using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShreeJiMart.Api.Data;
using ShreeJiMart.Api.Models;
using ShreeJiMart.Api.Services;

namespace ShreeJiMart.Api.Controllers;

[ApiController]
[Route("api/customer-auth")]
public sealed class CustomerAuthController(
    AppDbContext db,
    CustomerJwtService jwtService,
    GoogleAuthService googleAuth,
    IConfiguration config) : ControllerBase
{
    public sealed record CustomerDto(
        Guid Id,
        string AuthProvider,
        string? Email,
        string? DisplayName,
        string? Phone,
        string? DefaultAddress
    );

    public sealed record AuthResponse(string Token, CustomerDto Customer);

    public sealed record GoogleLoginRequest(string IdToken);

    public sealed record GuestLoginRequest(string? DisplayName);

    public sealed record UpdateProfileRequest(
        string? DisplayName,
        string? Phone,
        string? DefaultAddress
    );

    [HttpGet("setup-status")]
    public ActionResult<object> SetupStatus()
    {
        var clientId = (config["GOOGLE_CLIENT_ID"] ?? "").Trim();
        var envFile = Environment.GetEnvironmentVariable("SHREEJIMART_ENV_FILE");
        var databaseConfigured = !string.IsNullOrWhiteSpace(config["DATABASE_URL"]);

        return Ok(new
        {
            envFileLoaded = !string.IsNullOrWhiteSpace(envFile),
            envFile,
            googleClientIdConfigured = clientId.Length > 0,
            googleClientIdSuffix = clientId.Length > 8 ? clientId[^12..] : null,
            databaseConfigured,
            hint = clientId.Length == 0
                ? "Create backend/ShreeJiMart.Api/.env with GOOGLE_CLIENT_ID, then restart API from that folder."
                : "If Google login still fails, ensure googleClientId in Angular environment.ts matches GOOGLE_CLIENT_ID exactly.",
        });
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin([FromBody] GoogleLoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
            return BadRequest("Google ID token is required.");

        var clientId = config["GOOGLE_CLIENT_ID"];
        if (string.IsNullOrWhiteSpace(clientId))
            return StatusCode(503, "API is missing GOOGLE_CLIENT_ID. Copy .env.example to backend/ShreeJiMart.Api/.env and restart the API.");

        var payload = await googleAuth.ValidateIdTokenAsync(request.IdToken, ct);
        if (payload is null || string.IsNullOrWhiteSpace(payload.Subject))
            return Unauthorized(
                "Google sign-in failed. Set the same Client ID in API .env (GOOGLE_CLIENT_ID) and Angular environment.ts (googleClientId), then restart the API.");

        var customer = await db.Customers.FirstOrDefaultAsync(x => x.GoogleSub == payload.Subject, ct);

        if (customer is null)
        {
            customer = new Customer
            {
                Id = Guid.NewGuid(),
                AuthProvider = CustomerAuthProvider.Google,
                GoogleSub = payload.Subject,
                Email = payload.Email,
                DisplayName = payload.Name ?? payload.GivenName ?? "Google User",
                CreatedAt = DateTime.UtcNow,
            };
            db.Customers.Add(customer);
        }
        else
        {
            customer.AuthProvider = CustomerAuthProvider.Google;
            customer.Email = payload.Email ?? customer.Email;
            customer.DisplayName = payload.Name ?? customer.DisplayName;
        }

        customer.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new AuthResponse(jwtService.CreateToken(customer), ToDto(customer)));
    }

    [HttpPost("guest")]
    public async Task<ActionResult<AuthResponse>> GuestLogin([FromBody] GuestLoginRequest? request, CancellationToken ct)
    {
        var displayName = (request?.DisplayName ?? "").Trim();
        if (displayName.Length > 120) displayName = displayName[..120];

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            AuthProvider = CustomerAuthProvider.Guest,
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? "Guest" : displayName,
            CreatedAt = DateTime.UtcNow,
            LastLoginAt = DateTime.UtcNow,
        };

        db.Customers.Add(customer);
        await db.SaveChangesAsync(ct);

        return Ok(new AuthResponse(jwtService.CreateToken(customer), ToDto(customer)));
    }

    [Authorize(Roles = "Customer")]
    [HttpGet("me")]
    public async Task<ActionResult<CustomerDto>> Me(CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        return customer is null ? Unauthorized() : Ok(ToDto(customer));
    }

    [Authorize(Roles = "Customer")]
    [HttpPut("me")]
    public async Task<ActionResult<CustomerDto>> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var customer = await GetCurrentCustomerAsync(ct);
        if (customer is null) return Unauthorized();

        if (request.DisplayName is not null)
        {
            var name = request.DisplayName.Trim();
            if (name.Length is < 1 or > 120)
                return BadRequest("Display name must be 1-120 characters.");
            customer.DisplayName = name;
        }

        if (request.Phone is not null)
        {
            var phone = NormalizePhone(request.Phone);
            if (phone is null)
                return BadRequest("Phone must be a valid 10-digit Indian mobile number.");
            customer.Phone = phone;
        }

        if (request.DefaultAddress is not null)
        {
            var address = request.DefaultAddress.Trim();
            if (address.Length > 500)
                return BadRequest("Address must be at most 500 characters.");
            customer.DefaultAddress = address.Length == 0 ? null : address;
        }

        await db.SaveChangesAsync(ct);
        return Ok(ToDto(customer));
    }

    private async Task<Customer?> GetCurrentCustomerAsync(CancellationToken ct)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var customerId))
            return null;

        return await db.Customers.FirstOrDefaultAsync(x => x.Id == customerId, ct);
    }

    private static CustomerDto ToDto(Customer customer) =>
        new(
            customer.Id,
            customer.AuthProvider,
            customer.Email,
            customer.DisplayName,
            customer.Phone,
            customer.DefaultAddress);

    private static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length == 12 && digits.StartsWith("91")) digits = digits[2..];
        return digits.Length == 10 ? digits : null;
    }
}

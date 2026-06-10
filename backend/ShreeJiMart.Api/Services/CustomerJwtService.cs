using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ShreeJiMart.Api.Models;

namespace ShreeJiMart.Api.Services;

public sealed class CustomerJwtService(IConfiguration config)
{
    public string CreateToken(Customer customer)
    {
        var secret = config["CUSTOMER_JWT_SECRET"] ?? config["JWT_SECRET"] ?? "shreejimart-dev-customer-jwt-secret-change-me";
        var issuer = config["CUSTOMER_JWT_ISSUER"] ?? "ShreeJiMart";
        var days = int.TryParse(config["CUSTOMER_JWT_EXPIRY_DAYS"], out var d) ? d : 30;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, customer.Id.ToString()),
            new(ClaimTypes.Role, "Customer"),
            new("auth_provider", customer.AuthProvider),
        };

        if (!string.IsNullOrWhiteSpace(customer.DisplayName))
            claims.Add(new Claim(ClaimTypes.Name, customer.DisplayName));

        if (!string.IsNullOrWhiteSpace(customer.Email))
            claims.Add(new Claim(ClaimTypes.Email, customer.Email));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: "ShreeJiMartCustomers",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(days),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

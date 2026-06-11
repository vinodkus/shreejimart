using Google.Apis.Auth;

namespace ShreeJiMart.Api.Services;

public sealed class GoogleAuthService(IConfiguration config)
{
    public async Task<GoogleJsonWebSignature.Payload?> ValidateIdTokenAsync(string idToken, CancellationToken ct)
    {
        var clientId = (config["GOOGLE_CLIENT_ID"] ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") ?? "").Trim();
        if (string.IsNullOrWhiteSpace(clientId))
            return null;

        try
        {
            return await GoogleJsonWebSignature.ValidateAsync(
                idToken,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = [clientId],
                });
        }
        catch (InvalidJwtException)
        {
            return null;
        }
        catch (Exception)
        {
            return null;
        }
    }
}

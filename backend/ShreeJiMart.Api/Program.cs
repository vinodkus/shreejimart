using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using ShreeJiMart.Api.Data;
using ShreeJiMart.Api.Services;

var dotEnvVars = LoadDotEnvFiles();
var builder = WebApplication.CreateBuilder(args);

if (dotEnvVars.Count > 0)
    builder.Configuration.AddInMemoryCollection(dotEnvVars);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(GetCorsOrigins(builder.Configuration))
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(GetPostgresConnectionString(builder.Configuration)));

builder.Services.AddScoped<CustomerJwtService>();
builder.Services.AddScoped<GoogleAuthService>();

var jwtSecret = builder.Configuration["CUSTOMER_JWT_SECRET"]
    ?? builder.Configuration["JWT_SECRET"]
    ?? "shreejimart-dev-customer-jwt-secret-change-me";
var jwtIssuer = builder.Configuration["CUSTOMER_JWT_ISSUER"] ?? "ShreeJiMart";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = "ShreeJiMartCustomers",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
        };
    });

builder.Services.AddAuthorization();

var uploadDir = Path.Combine(builder.Environment.WebRootPath, "uploads", "products");
Directory.CreateDirectory(uploadDir);

var app = builder.Build();

var swaggerEnabled = app.Environment.IsDevelopment() ||
    string.Equals(Environment.GetEnvironmentVariable("SWAGGER_ENABLED"), "true", StringComparison.OrdinalIgnoreCase);

if (swaggerEnabled)
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new
{
    app = "ShreeJiMart API",
    status = "running",
    endpoints = new[] { "/api/categories", "/api/products", "/api/orders", "/swagger" },
}));

app.MapControllers();

app.Run();

static string[] GetCorsOrigins(IConfiguration config)
{
    var raw = config["CORS_ORIGINS"];
    if (!string.IsNullOrWhiteSpace(raw))
    {
        return raw
            .Split([';', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Length > 0)
            .ToArray();
    }

    return ["http://localhost:4200", "https://test.sanatini.com"];
}

static Dictionary<string, string?> LoadDotEnvFiles()
{
    var loaded = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
    foreach (var path in GetDotEnvCandidatePaths())
    {
        if (!File.Exists(path)) continue;

        foreach (var (key, value) in ParseDotEnvFile(path))
        {
            loaded[key] = value;
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
                Environment.SetEnvironmentVariable(key, value);
        }

        Environment.SetEnvironmentVariable("SHREEJIMART_ENV_FILE", Path.GetFullPath(path));
        break;
    }

    return loaded;
}

static IEnumerable<string> GetDotEnvCandidatePaths()
{
    var cwd = Directory.GetCurrentDirectory();
    var baseDir = AppContext.BaseDirectory;

    string[] candidates =
    [
        Path.Combine(cwd, ".env"),
        Path.Combine(cwd, "backend", "ShreeJiMart.Api", ".env"),
        Path.Combine(baseDir, ".env"),
        Path.Combine(baseDir, "..", "..", "..", ".env"),
        Path.Combine(baseDir, "..", "..", "..", "..", ".env"),
    ];

    return candidates.Select(Path.GetFullPath).Distinct();
}

static IEnumerable<(string Key, string Value)> ParseDotEnvFile(string path)
{
    foreach (var rawLine in File.ReadAllLines(path))
    {
        var line = rawLine.Trim();
        if (line.Length == 0 || line.StartsWith('#')) continue;

        var idx = line.IndexOf('=');
        if (idx <= 0) continue;

        var key = line[..idx].Trim().TrimStart('\uFEFF');
        var value = line[(idx + 1)..].Trim().Trim('"');
        if (key.Length > 0)
            yield return (key, value);
    }
}

static string GetPostgresConnectionString(IConfiguration config)
{
    var databaseUrl = config["DATABASE_URL"] ?? config["POSTGRES_CONNECTION_STRING"];
    if (!string.IsNullOrWhiteSpace(databaseUrl))
        return ConvertDatabaseUrl(databaseUrl);

    var host = config["POSTGRES_HOST"] ?? "localhost";
    var port = config["POSTGRES_PORT"] ?? "5432";
    var database = config["POSTGRES_DB"] ?? "ShreejiMart";
    var username = config["POSTGRES_USER"] ?? "postgres";
    var password = config["POSTGRES_PASSWORD"] ?? "change_me";

    var sslMode = config["POSTGRES_SSLMODE"];
    if (string.IsNullOrWhiteSpace(sslMode) && host.Contains("neon", StringComparison.OrdinalIgnoreCase))
        sslMode = "Require";

    var connection = new NpgsqlConnectionStringBuilder
    {
        Host = host,
        Port = int.TryParse(port, out var p) ? p : 5432,
        Database = database,
        Username = username,
        Password = password,
        IncludeErrorDetail = true,
    };

    if (!string.IsNullOrWhiteSpace(sslMode) &&
        Enum.TryParse<SslMode>(sslMode, ignoreCase: true, out var parsedSsl))
    {
        connection.SslMode = parsedSsl;
    }

    return connection.ConnectionString;
}

static string ConvertDatabaseUrl(string databaseUrl)
{
    var uri = new Uri(databaseUrl.Trim());

    var userInfo = uri.UserInfo.Split(':', 2);
    var username = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;

    var sslMode = SslMode.Prefer;
    if (!string.IsNullOrEmpty(uri.Query))
    {
        foreach (var part in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = part.Split('=', 2);
            if (kv.Length != 2) continue;
            if (!kv[0].Equals("sslmode", StringComparison.OrdinalIgnoreCase)) continue;

            sslMode = kv[1].ToLowerInvariant() switch
            {
                "require" => SslMode.Require,
                "disable" => SslMode.Disable,
                "prefer" => SslMode.Prefer,
                "verify-ca" => SslMode.VerifyCA,
                "verify-full" => SslMode.VerifyFull,
                _ => SslMode.Require,
            };
        }
    }

    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = username,
        Password = password,
        SslMode = sslMode,
        IncludeErrorDetail = true,
    };

    return builder.ConnectionString;
}

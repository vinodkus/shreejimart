using Microsoft.EntityFrameworkCore;
using ShreeJiMart.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

static string GetPostgresConnectionString(IConfiguration config)
{
    var host = config["POSTGRES_HOST"] ?? "localhost";
    var port = config["POSTGRES_PORT"] ?? "5432";
    var database = config["POSTGRES_DB"] ?? "ShreejiMart";
    var username = config["POSTGRES_USER"] ?? "postgres";
    var password = config["POSTGRES_PASSWORD"] ?? "change_me";

    return $"Host={host};Port={port};Database={database};Username={username};Password={password};Include Error Detail=true";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(GetPostgresConnectionString(builder.Configuration)));

var uploadDir = Path.Combine(builder.Environment.WebRootPath, "uploads", "products");
Directory.CreateDirectory(uploadDir);

var app = builder.Build();

if (app.Environment.IsDevelopment())
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
app.MapControllers();

app.Run();

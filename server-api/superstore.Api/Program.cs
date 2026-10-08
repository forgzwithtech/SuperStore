using Microsoft.EntityFrameworkCore;
using Superstore.Infrastructure.Data;
using Superstore.Application.Interfaces;
using Superstore.Infrastructure.Workers;
using Superstore.Api.Hubs;
using Superstore.API.Services;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System;

var builder = WebApplication.CreateBuilder(args);

// ─── SERVICES CONFIGURATION ─────────────────────────────────────────────

// Configured for local development + all Vercel preview/production deployments
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;
            var uri = new Uri(origin);
            return uri.Host == "localhost" 
                || uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);
        })
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<SuperstoreDbContext>(options =>
    options.UseNpgsql(connectionString, b => b.MigrationsAssembly("Superstore.Infrastructure")));

// ─── JWT AUTHENTICATION SETUP ───────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SuperstoreSuperSecretKeyForDevelopmentOnly12345!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true
        };
    });

// ─── DEPENDENCY INJECTION REGISTRATIONS ─────────────────────────────────
builder.Services.AddHttpClient();
builder.Services.AddScoped<FileUploadService>(); 
builder.Services.AddScoped<IStockNotifier, StockNotifier>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSignalR();
builder.Services.AddHostedService<OrderExpirationWorker>();

var app = builder.Build();

// ─── MIDDLEWARE PIPELINE ────────────────────────────────────────────────

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles(); 
app.UseRouting();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<InventoryHub>("/inventoryHub");

// ─── INITIALIZATION & AUTOMATED SEEDING ─────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<SuperstoreDbContext>();
        
        await context.Database.MigrateAsync(); 
        await DbSeeder.SeedAsync(context);
        
        Console.WriteLine("🚀 SUCCESS: Database initialized and seeded for Superstore.");
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred during DB initialization.");
    }
}

app.Run();
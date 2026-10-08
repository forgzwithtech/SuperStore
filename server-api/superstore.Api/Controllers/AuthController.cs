using Superstore.Core.Entities;
using Superstore.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Identity; // Added for native PasswordHasher
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace Superstore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly SuperstoreDbContext _dbContext;
    private readonly IConfiguration _configuration;
    
    // Use ASP.NET Core's built-in military-grade hasher
    private readonly PasswordHasher<User> _passwordHasher;

    public AuthController(SuperstoreDbContext dbContext, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _passwordHasher = new PasswordHasher<User>();
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // 1. Find the user
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());
        
        if (user == null || !user.IsActive) 
            return Unauthorized("Invalid credentials or account suspended.");

        // 2. Securely verify the password
        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        
        if (verificationResult == PasswordVerificationResult.Failed)
            return Unauthorized("Invalid credentials.");

        // 3. Mint the JWT Token
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "SuperstoreSuperSecretKeyForDevelopmentOnly12345!");
        
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role), // Assigns "Admin", "Staff", or "Rider"
                new Claim("FullName", user.FullName)
            }),
            Expires = DateTime.UtcNow.AddHours(12), // Supermarket shifts are usually 8-12 hours. Don't leave POS terminals logged in for 7 days!
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);

        return Ok(new
        {
            Token = tokenHandler.WriteToken(token),
            Role = user.Role,
            FullName = user.FullName
        });
    }
}

public class LoginRequest
{
    public required string Username { get; set; }
    public required string Password { get; set; }
}
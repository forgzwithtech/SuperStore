using Superstore.Core.Entities;
using Superstore.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace Superstore.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
// [Authorize(Roles = "Admin")] // Uncomment when auth is fully enforced
public class AdminUsersController : ControllerBase
{
    private readonly SuperstoreDbContext _dbContext;

    public AdminUsersController(SuperstoreDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // ─── 1. GET ALL PERSONNEL FOR DASHBOARD ─────────────────────────────────
    [HttpGet("all")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _dbContext.Users
            .Select(u => new 
            {
                Id = u.Id,
                Name = u.FullName, // Mapped to 'name' for the React frontend
                Phone = u.Username, // Using Username as the primary identifier/contact for the UI
                Role = u.Role,
                IsActive = u.IsActive
            })
            .OrderBy(u => u.Role)
            .ThenBy(u => u.Name)
            .ToListAsync();

        return Ok(users);
    }
}
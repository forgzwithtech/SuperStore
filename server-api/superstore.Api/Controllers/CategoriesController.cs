using Superstore.Core.Entities;
using Superstore.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace Superstore.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly SuperstoreDbContext _dbContext;

    public CategoriesController(SuperstoreDbContext dbContext) => _dbContext = dbContext;

    // ─── 1. GET ALL CATEGORIES WITH PRODUCT COUNTS ──────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // SUPERMARKET UPGRADE: Include ProductCount for frontend badges
        var categories = await _dbContext.Categories
            .Select(c => new 
            {
                Id = c.Id,
                Name = c.Name,
                Slug = c.Slug,
                ProductCount = c.Products.Count()
            })
            .OrderBy(c => c.Name)
            .ToListAsync();

        return Ok(categories);
    }

    // ─── 2. CREATE NEW CATEGORY ─────────────────────────────────────────────
    // [Authorize(Roles = "Admin")] // Uncomment when auth is fully wired up on the frontend
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) 
            return BadRequest("Category name cannot be empty.");

        var cleanName = request.Name.Trim();
        
        // Smarter slugification: handles ampersands and spaces cleanly
        var slug = cleanName.ToLower()
            .Replace(" & ", "-")
            .Replace("&", "-")
            .Replace(" ", "-");

        if (await _dbContext.Categories.AnyAsync(c => c.Slug == slug)) 
            return Conflict(new { Message = "A category with this name or slug already exists." });

        var category = new Category 
        { 
            Name = cleanName, 
            Slug = slug 
        };
        
        _dbContext.Categories.Add(category);
        await _dbContext.SaveChangesAsync();

        return Ok(new 
        { 
            Id = category.Id, 
            Name = category.Name, 
            Slug = category.Slug,
            Message = $"Category '{category.Name}' created successfully."
        });
    }
}

// ─── DTOs ───────────────────────────────────────────────────────────────
public class CreateCategoryDto
{
    public required string Name { get; set; }
}
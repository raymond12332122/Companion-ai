# Companion AI - Skill Activation Guide

## Installed Skills - Always Active

All skills are enabled and should be invoked proactively without the user requesting them explicitly.

### Core Skills to Use Proactively

**Napkin** (`/napkin`)
- Automatically read at session start to understand project context and learnings
- Update continuously with insights and solutions discovered
- Use to track recurring patterns and avoid repeating mistakes

**Caveman Suite** (Token Optimization)
- **caveman**: Use in normal mode for compressed communication when efficiency matters
- **caveman-commit**: Auto-invoke when user stages changes - write concise, semantic commit messages
- **caveman-review**: Auto-invoke when reviewing PRs - provide compressed, focused feedback
- **caveman-compress**: Compress memory files quarterly to reduce input tokens
- **caveman-explore**: Use for fast code discovery instead of vanilla Explore
- Other caveman-* skills: Use as relevant for their specialized purposes

**Frontend Design** (`/frontend-design`)
- Invoke automatically when building UI or frontend features
- Use to create distinctive, intentional visual design beyond templated defaults
- Apply to landing pages, dashboards, internal tools, and any user-facing interfaces

**Investigation & Development**
- **investigate-first**: Use proactively on ambiguous failures before making changes
- **lean-build**: Use for feature work with high overbuilding risk
- **safe-refactor**: Use when restructuring code to preserve behavior
- **surgical-patch**: Use for bug fixes at the narrowest responsible layer
- **verify-and-stop**: Use to validate work meets acceptance conditions

**Agent Development** (`/agent-development`)
- Use when creating custom agents or subagents
- Reference for agent structure, system prompts, triggering conditions

## Activation Strategy

1. **Session Start**: Load napkin first to understand context
2. **Ongoing Work**: Invoke appropriate skills based on task type:
   - UI work → frontend-design
   - Bug fixes → investigate-first + surgical-patch
   - Code changes → caveman-review (if PR) / caveman-commit (if staging)
   - Ambiguous problems → investigate-first
   - Large features → lean-build
   - Refactoring → safe-refactor

3. **Token Efficiency**: Use caveman mode actively to reduce input token usage
4. **Learning**: Update napkin with discoveries and patterns learned

## OmniRoute Gateway

OmniRoute is running on `localhost:20128` as the AI gateway. It provides:
- Access to 339+ AI providers and models
- Token compression (15-95% savings)
- Automatic fallback and routing
- Zero-config operation with free providers

## Project Context

- Repository: raymond12332122/Companion-ai
- Branch: claude/install-caveman-skill-1rgdul
- All skills installed and symlinked
- Ready for productive development with automated optimizations

## Remember

- Always start by reading napkin for context
- Proactively invoke skills matching the current task
- Use caveman mode for efficiency
- Update napkin continuously
- Skills are tools - use them without waiting for explicit requests

package net.mctiers.arena;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class ArenaManager {
    private final Map<String, Arena> arenas = new ConcurrentHashMap<>();

    public void registerArena(Arena arena) {
        arenas.put(arena.getId().toLowerCase(), arena);
    }

    public Optional<Arena> getArena(String id) {
        return Optional.ofNullable(arenas.get(id.toLowerCase()));
    }

    public Optional<Arena> allocateAvailableArena() {
        return arenas.values().stream()
                .filter(a -> !a.isInUse() && a.getSpawn1() != null && a.getSpawn2() != null)
                .findFirst()
                .map(a -> {
                    a.setInUse(true);
                    return a;
                });
    }

    public void releaseArena(String id) {
        Arena arena = arenas.get(id.toLowerCase());
        if (arena != null) {
            arena.setInUse(false);
        }
    }

    public Collection<Arena> getArenas() {
        return arenas.values();
    }
}

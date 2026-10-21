package net.mctiers.arena;

import org.bukkit.Location;

public class Arena {
    private final String id;
    private Location spawn1;
    private Location spawn2;
    private boolean inUse;

    public Arena(String id, Location spawn1, Location spawn2) {
        this.id = id;
        this.spawn1 = spawn1;
        this.spawn2 = spawn2;
        this.inUse = false;
    }

    public String getId() {
        return id;
    }

    public Location getSpawn1() {
        return spawn1;
    }

    public void setSpawn1(Location spawn1) {
        this.spawn1 = spawn1;
    }

    public Location getSpawn2() {
        return spawn2;
    }

    public void setSpawn2(Location spawn2) {
        this.spawn2 = spawn2;
    }

    public boolean isInUse() {
        return inUse;
    }

    public void setInUse(boolean inUse) {
        this.inUse = inUse;
    }
}

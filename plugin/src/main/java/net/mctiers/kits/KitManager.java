package net.mctiers.kits;

import org.bukkit.Material;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;

public class KitManager {

    public void giveKit(Player player, String gamemode) {
        player.getInventory().clear();
        for (PotionEffect effect : player.getActivePotionEffects()) {
            player.removePotionEffect(effect.getType());
        }

        switch (gamemode.toLowerCase()) {
            case "sword" -> giveSwordKit(player);
            case "crystal" -> giveCrystalKit(player);
            case "pot", "nodebuff" -> givePotKit(player);
            case "axe" -> giveAxeKit(player);
            case "mace" -> giveMaceKit(player);
            case "uhc" -> giveUhcKit(player);
            default -> giveDefaultKit(player);
        }

        player.setHealth(20.0);
        player.setFoodLevel(20);
        player.setSaturation(20.0f);
    }

    private void giveSwordKit(Player p) {
        ItemStack sword = new ItemStack(Material.DIAMOND_SWORD);
        sword.addEnchantment(Enchantment.SHARPNESS, 5);
        p.getInventory().setItem(0, sword);
        p.getInventory().setItem(1, new ItemStack(Material.COOKED_BEEF, 64));
        p.getInventory().setItemInOffHand(new ItemStack(Material.SHIELD));

        p.getInventory().setHelmet(new ItemStack(Material.DIAMOND_HELMET));
        p.getInventory().setChestplate(new ItemStack(Material.DIAMOND_CHESTPLATE));
        p.getInventory().setLeggings(new ItemStack(Material.DIAMOND_LEGGINGS));
        p.getInventory().setBoots(new ItemStack(Material.DIAMOND_BOOTS));
    }

    private void giveCrystalKit(Player p) {
        ItemStack sword = new ItemStack(Material.NETHERITE_SWORD);
        sword.addEnchantment(Enchantment.SHARPNESS, 5);
        p.getInventory().setItem(0, sword);
        p.getInventory().setItem(1, new ItemStack(Material.END_CRYSTAL, 64));
        p.getInventory().setItem(2, new ItemStack(Material.OBSIDIAN, 64));
        p.getInventory().setItem(3, new ItemStack(Material.RESPAWN_ANCHOR, 64));
        p.getInventory().setItem(4, new ItemStack(Material.GLOWSTONE, 64));
        p.getInventory().setItem(5, new ItemStack(Material.ENDER_PEARL, 16));
        p.getInventory().setItem(6, new ItemStack(Material.GOLDEN_APPLE, 64));
        p.getInventory().setItemInOffHand(new ItemStack(Material.TOTEM_OF_UNDYING));

        // Fill remaining hotbar/inventory with totems
        for (int i = 7; i < 9; i++) {
            p.getInventory().setItem(i, new ItemStack(Material.TOTEM_OF_UNDYING));
        }

        p.getInventory().setHelmet(new ItemStack(Material.NETHERITE_HELMET));
        p.getInventory().setChestplate(new ItemStack(Material.NETHERITE_CHESTPLATE));
        p.getInventory().setLeggings(new ItemStack(Material.NETHERITE_LEGGINGS));
        p.getInventory().setBoots(new ItemStack(Material.NETHERITE_BOOTS));
    }

    private void givePotKit(Player p) {
        ItemStack sword = new ItemStack(Material.DIAMOND_SWORD);
        sword.addEnchantment(Enchantment.SHARPNESS, 5);
        p.getInventory().setItem(0, sword);
        p.getInventory().setItem(1, new ItemStack(Material.ENDER_PEARL, 16));
        p.getInventory().setItem(2, new ItemStack(Material.COOKED_BEEF, 64));

        p.addPotionEffect(new PotionEffect(PotionEffectType.SPEED, Integer.MAX_VALUE, 1));
        p.addPotionEffect(new PotionEffect(PotionEffectType.STRENGTH, Integer.MAX_VALUE, 0));

        p.getInventory().setHelmet(new ItemStack(Material.DIAMOND_HELMET));
        p.getInventory().setChestplate(new ItemStack(Material.DIAMOND_CHESTPLATE));
        p.getInventory().setLeggings(new ItemStack(Material.DIAMOND_LEGGINGS));
        p.getInventory().setBoots(new ItemStack(Material.DIAMOND_BOOTS));

        // Fill rest with splash health potions
        for (int i = 3; i < 36; i++) {
            p.getInventory().setItem(i, new ItemStack(Material.SPLASH_POTION));
        }
    }

    private void giveAxeKit(Player p) {
        ItemStack axe = new ItemStack(Material.DIAMOND_AXE);
        axe.addEnchantment(Enchantment.SHARPNESS, 5);
        p.getInventory().setItem(0, axe);
        p.getInventory().setItem(1, new ItemStack(Material.CROSSBOW));
        p.getInventory().setItem(2, new ItemStack(Material.ARROW, 64));
        p.getInventory().setItem(3, new ItemStack(Material.COOKED_BEEF, 64));
        p.getInventory().setItemInOffHand(new ItemStack(Material.SHIELD));

        p.getInventory().setHelmet(new ItemStack(Material.DIAMOND_HELMET));
        p.getInventory().setChestplate(new ItemStack(Material.DIAMOND_CHESTPLATE));
        p.getInventory().setLeggings(new ItemStack(Material.DIAMOND_LEGGINGS));
        p.getInventory().setBoots(new ItemStack(Material.DIAMOND_BOOTS));
    }

    private void giveMaceKit(Player p) {
        ItemStack mace = new ItemStack(Material.MACE);
        mace.addEnchantment(Enchantment.DENSITY, 5);
        p.getInventory().setItem(0, mace);
        p.getInventory().setItem(1, new ItemStack(Material.WIND_CHARGE, 64));
        p.getInventory().setItem(2, new ItemStack(Material.GOLDEN_APPLE, 16));
        p.getInventory().setItemInOffHand(new ItemStack(Material.SHIELD));

        p.getInventory().setHelmet(new ItemStack(Material.NETHERITE_HELMET));
        p.getInventory().setChestplate(new ItemStack(Material.NETHERITE_CHESTPLATE));
        p.getInventory().setLeggings(new ItemStack(Material.NETHERITE_LEGGINGS));
        p.getInventory().setBoots(new ItemStack(Material.NETHERITE_BOOTS));
    }

    private void giveUhcKit(Player p) {
        ItemStack sword = new ItemStack(Material.DIAMOND_SWORD);
        p.getInventory().setItem(0, sword);
        p.getInventory().setItem(1, new ItemStack(Material.FISHING_ROD));
        p.getInventory().setItem(2, new ItemStack(Material.BOW));
        p.getInventory().setItem(3, new ItemStack(Material.ARROW, 64));
        p.getInventory().setItem(4, new ItemStack(Material.GOLDEN_APPLE, 6));

        p.getInventory().setHelmet(new ItemStack(Material.IRON_HELMET));
        p.getInventory().setChestplate(new ItemStack(Material.DIAMOND_CHESTPLATE));
        p.getInventory().setLeggings(new ItemStack(Material.IRON_LEGGINGS));
        p.getInventory().setBoots(new ItemStack(Material.DIAMOND_BOOTS));
    }

    private void giveDefaultKit(Player p) {
        p.getInventory().setItem(0, new ItemStack(Material.DIAMOND_SWORD));
        p.getInventory().setItem(1, new ItemStack(Material.COOKED_BEEF, 64));
        p.getInventory().setItemInOffHand(new ItemStack(Material.SHIELD));
    }
}

export class SurvivalSystem {
    public maxHealth = 20;
    public health = 20;

    public maxHunger = 20;
    public hunger = 20;

    private timeSinceLastHungerDrain = 0;
    private hungerDrainRate = 10; // seconds per hunger point

    public update(delta: number) {
        this.timeSinceLastHungerDrain += delta;
        if (this.timeSinceLastHungerDrain > this.hungerDrainRate) {
            this.timeSinceLastHungerDrain = 0;
            if (this.hunger > 0) {
                this.hunger -= 1;
            } else {
                this.takeDamage(1); // Starving
            }
        }

        // Natural healing if hunger is full
        if (this.hunger === this.maxHunger && this.health < this.maxHealth) {
            if (Math.random() < 0.01) { // Slow chance to heal per frame
                this.health += 1;
            }
        }
    }

    public takeDamage(amount: number) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    public eat(foodValue: number) {
        this.hunger = Math.min(this.maxHunger, this.hunger + foodValue);
    }

    private die() {
        console.log("Player died!");
        // Reset or drop inventory logic here
        this.health = this.maxHealth;
        this.hunger = this.maxHunger;
    }
}

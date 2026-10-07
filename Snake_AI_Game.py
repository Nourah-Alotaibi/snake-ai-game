import pygame
import random
import sys

# Initialize Pygame
pygame.init()

# Screen dimensions and grid size
SCREEN_WIDTH = 400
SCREEN_HEIGHT = 400
CELL_SIZE = 20

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
PINK = (255, 182, 193)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
GREEN = (0, 255, 0)

# Initialize screen
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT + 100))
pygame.display.set_caption("Snake Game with AI")
clock = pygame.time.Clock()

# Initialize snake and food
snake = [(5, 5)]  # Snake's initial position (grid coordinates)
direction = (0, 1)  # Initial direction: moving right
food = (random.randint(0, SCREEN_WIDTH // CELL_SIZE - 1),
        random.randint(0, SCREEN_HEIGHT // CELL_SIZE - 1))

# Score tracker
score = 0
penalties = 0  # Count penalties separately
reward = 0  # Reward tracker for RL

# AI parameters
learning_rate = 0.001
epsilon = 1.0  # Exploration rate
epsilon_decay = 0.995
epsilon_min = 0.01
num_neurons = 128  # Example number of neurons in a layer
num_layers = 2  # Example number of layers in the AI model

# Stop button flag
stop_game = False

def draw_snake(snake):
    """Draws the snake on the screen."""
    for segment in snake:
        pygame.draw.rect(screen, PINK,
                         (segment[0] * CELL_SIZE, segment[1] * CELL_SIZE, CELL_SIZE, CELL_SIZE))

def draw_food(food):
    """Draws the food on the screen."""
    pygame.draw.rect(screen, RED,
                     (food[0] * CELL_SIZE, food[1] * CELL_SIZE, CELL_SIZE, CELL_SIZE))

def move_snake(snake, direction):
    """Moves the snake in the current direction."""
    head = snake[0]
    new_head = (head[0] + direction[0], head[1] + direction[1])
    snake = [new_head] + snake[:-1]
    return snake

def check_collision(snake):
    """Checks if the snake collides with walls or itself."""
    head = snake[0]
    # Check wall collision
    if head[0] < 0 or head[1] < 0 or head[0] >= SCREEN_WIDTH // CELL_SIZE or head[1] >= SCREEN_HEIGHT // CELL_SIZE:
        return True
    # Check self-collision
    if head in snake[1:]:
        return True
    return False

def check_food(snake, food):
    """Checks if the snake eats the food."""
    global score, reward
    if snake[0] == food:
        snake.append(snake[-1])  # Grow the snake
        score += 1
        reward = 1  # Positive reward for eating food
        # Ensure food is not placed on the snake
        while food in snake:
            food = (random.randint(0, SCREEN_WIDTH // CELL_SIZE - 1),
                    random.randint(0, SCREEN_HEIGHT // CELL_SIZE - 1))
    return snake, food

def check_tail_collision(snake):
    """Checks if the snake head touches its tail (last segment)."""
    if snake[0] == snake[-1] and len(snake) > 3:
        return True
    return False

def reset_game():
    """Resets the game state."""
    global snake, direction, food, score, penalties, reward, epsilon
    snake = [(5, 5)]  # Reset snake position
    direction = (0, 1)  # Reset direction
    food = (random.randint(0, SCREEN_WIDTH // CELL_SIZE - 1),
            random.randint(0, SCREEN_HEIGHT // CELL_SIZE - 1))  # Place new food
    score = 0  # Reset score
    penalties += 1  # Increment penalties
    reward = 0  # Reset reward
    epsilon = 1.0  # Reset exploration rate

def ai_choose_action(snake, food):
    """
    Placeholder for AI logic.
    Replace this with your trained model to decide the next action.
    """
    global epsilon

    # Example: Move towards food (basic greedy AI)
    head = snake[0]
    if random.random() < epsilon:  # Exploration
        return random.choice([(0, -1), (0, 1), (-1, 0), (1, 0)])
    else:  # Exploitation
        if food[0] > head[0]:
            return (1, 0)  # Move right
        elif food[0] < head[0]:
            return (-1, 0)  # Move left
        elif food[1] > head[1]:
            return (0, 1)  # Move down
        elif food[1] < head[1]:
            return (0, -1)  # Move up
    return direction  # Keep current direction

# Main game loop
running = True
while running:
    reward = 0  # Reset reward for each step
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_s:  # Stop game when 'S' is pressed
                stop_game = True

    if stop_game:
        print(f"Game Stopped! Final score: {score}")
        break

    # AI or player decision
    direction = ai_choose_action(snake, food)

    # Update the snake
    snake = move_snake(snake, direction)

    # Debugging output
    print(f"Snake: {snake}")
    print(f"Food: {food}")

    # Check for collisions or tail collision
    if check_collision(snake) or check_tail_collision(snake):
        print("Collision detected. Restarting game...")
        pygame.time.wait(1000)  # Pause before resetting
        reset_game()
        continue

    # Check if the snake eats food
    snake, food = check_food(snake, food)

    # Decay epsilon
    if epsilon > epsilon_min:
        epsilon *= epsilon_decay

    # Render the screen
    screen.fill(BLACK)
    draw_snake(snake)
    draw_food(food)

    # Draw separate text field
    pygame.draw.rect(screen, GREEN, (0, SCREEN_HEIGHT, SCREEN_WIDTH, 100), 2)  # Green border only
    font = pygame.font.Font(None, 18)

    score_text = font.render(f"Score: {score}", True, PINK)
    penalties_text = font.render(f"Penalties: {penalties}", True, PINK)
    reward_text = font.render(f"Reward: {reward}", True, PINK)
    lr_text = font.render(f"Learning Rate: {learning_rate}", True, PINK)
    epsilon_text = font.render(f"Exploration Rate (Epsilon): {epsilon:.4f}", True, PINK)
    neurons_text = font.render(f"Neurons: {num_neurons} | Layers: {num_layers}", True, PINK)
    behavior_text = font.render(f"Behavior: {'Exploring' if random.random() < epsilon else 'Exploiting'}", True, PINK)
    learning_status = font.render("Learning: Improving Strategies", True, PINK)

    screen.blit(score_text, (10, SCREEN_HEIGHT + 10))
    screen.blit(penalties_text, (10, SCREEN_HEIGHT + 30))
    screen.blit(reward_text, (10, SCREEN_HEIGHT + 50))
    screen.blit(lr_text, (10, SCREEN_HEIGHT + 70))
    screen.blit(epsilon_text, (200, SCREEN_HEIGHT + 10))
    screen.blit(neurons_text, (200, SCREEN_HEIGHT + 30))
    screen.blit(behavior_text, (200, SCREEN_HEIGHT + 50))
    screen.blit(learning_status, (200, SCREEN_HEIGHT + 70))

    pygame.display.flip()  # Update the display

    clock.tick(10)  # 10 frames per second

pygame.quit()
sys.exit()

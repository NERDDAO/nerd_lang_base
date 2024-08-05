# # Image size ~ 400MB
FROM node:22-bullseye-slim as builder

# Enable Corepack and prepare for PNPM installation to increase performance
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin

# Set the working directory
WORKDIR /app

COPY . .
# Copy package.json and pnpm-lock.yaml files to the working directory
COPY package*.json pnpm-lock.yaml ./

RUN apt-get update && apt-get install -y .gyp \
        python3 \
        make \
        g++ \
    && apt-get install -y git \
    && pnpm install \
 		&& rm -rf /var/lib/apt/lists/*

# Create a new stage for deployment
FROM builder as deploy

# Copy only necessary files and directories for deployment
COPY --from=builder /app/src ./src 
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/data ./data 

RUN npm cache clean --force && \
		pnpm install && \ 
		rm -rf $PNPM_HOME/.npm $PNPM_HOME/.node-gyp
CMD ["pnpm", "start"]

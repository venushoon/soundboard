FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
# 음량 분석(BS.1770 loudnorm/ebur128)용 ffmpeg
RUN apk add --no-cache ffmpeg
COPY server ./server
COPY public/seeds ./public/seeds
COPY --from=build /app/dist ./dist
EXPOSE 8900
VOLUME ["/app/data"]
CMD ["node", "server/index.js"]

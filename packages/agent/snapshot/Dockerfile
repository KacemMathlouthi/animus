# Prebaked Manim + LaTeX environment for animus sandboxes.
#
# Built once into a Daytona snapshot (see ../scripts/build-snapshot.ts) so that
# sandboxes boot with the toolchain already present — no per-sandbox bootstrap.
# Daytona injects its own user/daemon at runtime, so this image needs no USER or
# ENTRYPOINT; it only has to carry the tools. Must be built for linux/amd64.
FROM python:3.12-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System libraries Manim needs (Cairo/Pango rendering + ffmpeg), the build
# toolchain for its native deps, and the TeX Live set Manim recommends so
# Tex/MathTex render.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      python3-dev \
      pkg-config \
      libcairo2-dev \
      libpango1.0-dev \
      ffmpeg \
      dvisvgm \
      texlive \
      texlive-latex-base \
      texlive-latex-extra \
      texlive-latex-recommended \
      texlive-fonts-recommended \
      texlive-fonts-extra \
      texlive-science \
      tipa \
      fontconfig \
      fonts-lmodern \
      sox \
      libsox-fmt-all \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

# Manim plus manim-voiceover (ElevenLabs narration; sox adjusts speech speed).
RUN pip install --upgrade pip && pip install manim "manim-voiceover[elevenlabs]"

# Project directory the agent's tools write into. World-writable so it works
# whatever user Daytona runs the sandbox as. The Manim craft skill is added to
# the image separately (see ../scripts/build-snapshot.ts) so it can live outside
# this build context.
RUN mkdir -p /home/daytona/project && chmod -R 777 /home/daytona

WORKDIR /home/daytona/project

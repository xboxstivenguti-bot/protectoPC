FROM mcr.microsoft.com/dotnet/sdk:8.0

ARG TARGETARCH

ENV DEBIAN_FRONTEND=noninteractive \
    TERM=xterm-256color \
    HOME=/home/ander \
    POWERSHELL_TELEMETRY_OPTOUT=1 \
    PATH=/home/ander/.local/bin:/usr/local/bin:${PATH}

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       sudo git curl wget unzip zip ca-certificates jq nano vim \
       openssh-client build-essential python3 python3-pip python3-venv \
       nodejs npm procps lsof \
    && case "${TARGETARCH:-amd64}" in \
         amd64) TTYD_ARCH=x86_64 ;; \
         arm64) TTYD_ARCH=aarch64 ;; \
         *) echo "Arquitectura no compatible para ttyd: ${TARGETARCH}" >&2; exit 1 ;; \
       esac \
    && curl -fsSL "https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.${TTYD_ARCH}" -o /usr/local/bin/ttyd \
    && chmod 0755 /usr/local/bin/ttyd \
    && npm install -g opencode-ai \
    && useradd --create-home --uid 1000 --shell /usr/bin/pwsh ander \
    && echo 'ander ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ander \
    && chmod 0440 /etc/sudoers.d/ander \
    && mkdir -p /workspace \
       /home/ander/.config/powershell \
       /home/ander/.config/opencode \
       /home/ander/.local/share/opencode \
       /home/ander/.cache/opencode \
    && chown -R ander:ander /workspace /home/ander \
    && rm -rf /var/lib/apt/lists/*

COPY profile.ps1 /home/ander/.config/powershell/Microsoft.PowerShell_profile.ps1
RUN chown ander:ander /home/ander/.config/powershell/Microsoft.PowerShell_profile.ps1

USER ander
WORKDIR /workspace
EXPOSE 7681

CMD ["ttyd", "-W", "-p", "7681", "pwsh", "-NoLogo", "-NoExit"]
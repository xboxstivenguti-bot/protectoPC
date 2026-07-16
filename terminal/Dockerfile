FROM mcr.microsoft.com/powershell:7.6-ubuntu-24.04

ENV DEBIAN_FRONTEND=noninteractive \
    TERM=xterm-256color \
    HOME=/home/ander

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ttyd sudo git curl wget unzip zip ca-certificates jq nano vim \
       openssh-client build-essential python3 python3-pip python3-venv \
       nodejs npm procps lsof \
    && useradd --create-home --uid 1000 --shell /usr/bin/pwsh ander \
    && echo 'ander ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ander \
    && chmod 0440 /etc/sudoers.d/ander \
    && mkdir -p /workspace /home/ander/.config/powershell \
    && chown -R ander:ander /workspace /home/ander \
    && rm -rf /var/lib/apt/lists/*

COPY profile.ps1 /home/ander/.config/powershell/Microsoft.PowerShell_profile.ps1
RUN chown ander:ander /home/ander/.config/powershell/Microsoft.PowerShell_profile.ps1

USER ander
WORKDIR /workspace
EXPOSE 7681

# Caddy elimina el prefijo /powershell antes de llegar aquí.
CMD ["ttyd", "-W", "-p", "7681", "pwsh", "-NoLogo", "-NoExit"]

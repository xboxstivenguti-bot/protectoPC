FROM lscr.io/linuxserver/webtop:debian-xfce

RUN apt-get update \
    && apt-get install -y --no-install-recommends synaptic \
    && echo 'abc ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/abc \
    && chmod 0440 /etc/sudoers.d/abc \
    && rm -rf /var/lib/apt/lists/*
